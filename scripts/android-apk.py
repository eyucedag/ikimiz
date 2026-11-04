"""Submit a signed EAS Android APK and save its public installation details."""
import errno
import json
import os
from pathlib import Path
import pty
import re
import select
import signal
import subprocess
import sys
import time

OUTPUT = Path("dist/android-build")
CLI = ["npx", "--yes", "eas-cli@latest"]
ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


def save(name, value):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / name).write_text(json.dumps(value, indent=2) + "\n")


def public_log(text):
    token = os.environ.get("EXPO_TOKEN")
    return text.replace(token, "***") if token else text


def eas_json(*args):
    result = subprocess.run(CLI + list(args) + ["--json"], check=True,
                            stdout=subprocess.PIPE, text=True)
    return json.loads(result.stdout)


def submit_with_remote_signing():
    # A terminal is needed only for EAS's first Android keystore confirmation.
    # Accept that specific setup prompt; never approve billing or other prompts.
    pid, terminal = pty.fork()
    if pid == 0:
        environment = dict(os.environ)
        environment.pop("CI", None)
        environment["TERM"] = "xterm"
        environment["NO_COLOR"] = "1"
        command = CLI + ["build", "--platform", "android", "--profile", "preview", "--no-wait"]
        os.execvpe(command[0], command, environment)
    transcript = ""
    approved_keystore = False
    deadline = time.monotonic() + 900
    try:
        while time.monotonic() < deadline:
            ready, _, _ = select.select([terminal], [], [], 1)
            if ready:
                try:
                    raw = os.read(terminal, 65536)
                except OSError as error:
                    if error.errno == errno.EIO:
                        break
                    raise
                if not raw:
                    break
                text = raw.decode("utf-8", errors="replace")
                print(public_log(text), end="", flush=True)
                transcript += text
                plain = ANSI.sub("", transcript)
                prompts = ["Generate a new Android Keystore?", "Generate a new Keystore?"]
                if not approved_keystore and any(prompt in plain for prompt in prompts):
                    os.write(terminal, b"y\r")
                    approved_keystore = True
        else:
            raise RuntimeError("EAS submission timed out; no additional prompts were approved.")
        _, status = os.waitpid(pid, 0)
        pid = None
        if os.waitstatus_to_exitcode(status) != 0:
            raise RuntimeError("EAS could not submit the APK. See the build step log.")
        return ANSI.sub("", transcript)
    finally:
        os.close(terminal)
        if pid:
            try:
                os.kill(pid, signal.SIGTERM)
                os.waitpid(pid, 0)
            except ProcessLookupError:
                pass


def submit():
    if not os.environ.get("EXPO_TOKEN"):
        raise RuntimeError("The GitHub Actions repository secret EXPO_TOKEN is required.")
    config = json.loads(Path("app.json").read_text())
    account = config["expo"]["owner"]
    subprocess.run(CLI + ["init", "--account", account, "--force", "--non-interactive"], check=True)
    config = json.loads(Path("app.json").read_text())
    save("project.json", {"account": account, "slug": config["expo"]["slug"],
                          "projectId": config["expo"]["extra"]["eas"]["projectId"]})
    transcript = submit_with_remote_signing()
    ids = re.findall(r"https://expo\.dev/accounts/[^/\s]+/projects/[^/\s]+/builds/([a-f0-9-]{36})", transcript)
    if ids:
        build = eas_json("build:view", ids[-1])
    else:
        builds = eas_json("build:list", "--platform", "android", "--build-profile", "preview",
                          "--limit", "1", "--non-interactive")
        if not builds:
            raise RuntimeError("EAS returned no Android build after submission.")
        build = builds[0]
    save("build.json", build)
    print("\nAndroid build submitted: " + build["id"], flush=True)


def wait_for_apk():
    initial = json.loads((OUTPUT / "build.json").read_text())
    deadline = time.monotonic() + 60 * 60
    last_status = None
    while time.monotonic() < deadline:
        build = eas_json("build:view", initial["id"])
        status = build["status"]
        if status != last_status:
            print("Android build status: " + status, flush=True)
            last_status = status
        if status == "FINISHED":
            artifacts = build.get("artifacts", {})
            url = artifacts.get("applicationArchiveUrl") or artifacts.get("buildUrl")
            if not url:
                raise RuntimeError("EAS finished without an APK download URL.")
            project = json.loads((OUTPUT / "project.json").read_text())
            result = {"buildId": build["id"], "apkUrl": url, "status": status,
                      "projectId": project["projectId"], "account": project["account"]}
            save("apk.json", result)
            save("build.json", build)
            summary = os.environ.get("GITHUB_STEP_SUMMARY")
            if summary:
                with open(summary, "a") as file:
                    file.write("\n[Download İkimiz Android APK](" + url + ")\n")
            print("APK ready: " + url, flush=True)
            return
        if status in ["ERRORED", "CANCELED", "CANCELLED"]:
            save("build.json", build)
            raise RuntimeError("EAS build ended with status " + status)
        time.sleep(30)
    raise RuntimeError("The build is still queued or running after one hour; its EAS ID was saved.")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in ["submit", "wait"]:
            raise RuntimeError("Usage: android-apk.py submit|wait")
        {"submit": submit, "wait": wait_for_apk}[sys.argv[1]]()
    except Exception as error:
        print(public_log(str(error)), file=sys.stderr)
        sys.exit(1)
