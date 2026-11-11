import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const coupleId = '11111111-1111-4111-8111-111111111111';
const migration = (name) => readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');

test('database migrations preserve mood data and species health semantics', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create role authenticated;
      create function auth.uid() returns uuid language sql as $$ select '${coupleId}'::uuid $$;
      create table public.couples (id uuid primary key);
      insert into public.couples values ('${coupleId}');
      create function public.is_couple_member(uuid) returns boolean language sql as $$
        select coalesce(current_setting('test.member', true), 'yes') = 'yes'
      $$;
      create publication supabase_realtime;
      create table public.mood_entries (mood text not null check (mood in ('great','good','okay','low','rough')));
      insert into public.mood_entries values ('good');
    `);
    for (const name of [
      '20261107_shared_couple_flower',
      '20261107_couple_flower_plant_types',
      '20261107_species_based_couple_flower_health',
      '20261108_flower_health_consistency',
      '20261107_expand_mood_options',
    ]) {
      await db.exec(await migration(name));
    }
    const seed = async (type, health, days) =>
      db.query(
        `
      insert into public.couple_flower_state(couple_id, plant_type, health, updated_at, last_watered_at)
      values ($1,$2,$3,now() - $4 * interval '1 day',null)
      on conflict (couple_id) do update set plant_type=$2, health=$3, updated_at=now() - $4 * interval '1 day', last_watered_at=null
    `,
        [coupleId, type, health, days],
      );

    await t.test('new moods are accepted and previous records remain', async () => {
      await db.exec("insert into public.mood_entries values ('tired'), ('energetic'), ('angry'), ('bored');");
      assert.equal((await db.query('select * from public.mood_entries')).rows.length, 5);
      await assert.rejects(db.exec("insert into public.mood_entries values ('invalid');"));
    });
    for (const [type, expected] of [
      ['hanging', 28],
      ['violet', 22],
      ['cactus', 14],
    ]) {
      await t.test(`a long-dry ${type} can recover when watered`, async () => {
        await seed(type, 10, 365);
        const result = await db.query('select * from public.water_couple_flower($1)', [coupleId]);
        assert.equal(result.rows[0].health, expected);
        assert.ok(result.rows[0].last_watered_at);
      });
    }
    await t.test('a cactus loses only one health point per day', async () => {
      await seed('cactus', 80, 5);
      assert.equal(
        (await db.query('select * from public.water_couple_flower($1)', [coupleId])).rows[0].health,
        89,
      );
    });
    await t.test(
      'changing plant keeps damage from the previous species and does not count as watering',
      async () => {
        await seed('hanging', 90, 2);
        const result = await db.query('select * from public.set_couple_flower_plant($1,$2)', [
          coupleId,
          'cactus',
        ]);
        assert.equal(result.rows[0].health, 72);
        assert.equal(result.rows[0].plant_type, 'cactus');
        assert.equal(result.rows[0].last_watered_at, null);
      },
    );
    await t.test('health stays within 0..100 after simultaneous watering', async () => {
      await seed('violet', 95, 0);
      await Promise.all([
        db.query('select * from public.water_couple_flower($1)', [coupleId]),
        db.query('select * from public.water_couple_flower($1)', [coupleId]),
      ]);
      assert.equal((await db.query('select health from public.couple_flower_state')).rows[0].health, 100);
    });
    await t.test('an unauthorized caller cannot water or change the plant', async () => {
      await db.exec("set test.member = 'no';");
      await assert.rejects(
        db.query('select * from public.water_couple_flower($1)', [coupleId]),
        /Not an active member/,
      );
      await assert.rejects(
        db.query('select * from public.set_couple_flower_plant($1,$2)', [coupleId, 'cactus']),
        /Not an active member/,
      );
      await db.exec("set test.member = 'yes';");
    });
    await t.test('invalid plant types are rejected and migrations can be rerun', async () => {
      await assert.rejects(
        db.query('select * from public.set_couple_flower_plant($1,$2)', [coupleId, null]),
        /Invalid plant type/,
      );
      await db.exec(await migration('20261108_flower_health_consistency'));
      await db.exec(await migration('20261107_expand_mood_options'));
      assert.equal((await db.query('select * from public.mood_entries')).rows.length, 5);
    });
  } finally {
    await db.close();
  }
});

test('shared content can be edited or removed by either active partner', async () => {
  const db = new PGlite();
  const coupleA = '11111111-1111-4111-8111-111111111111';
  const partnerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const partnerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create schema storage;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.user_id', true), '')::uuid
      $$;
      create function public.is_couple_member(target uuid) returns boolean language sql stable as $$
        select current_setting('request.is_member', true) = 'yes'
          and target::text = current_setting('request.couple_id', true)
      $$;
      create function storage.foldername(path text) returns text[] language sql immutable as $$
        select string_to_array(regexp_replace(path, '/[^/]*$', ''), '/')
      $$;
      create table storage.objects(bucket_id text, name text);
      create table public.calendar_events(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.important_dates(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.lists(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.list_items(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.note_folders(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.notes(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.tasks(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.reminders(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.partner_facts(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.gift_ideas(id uuid, owner_id uuid, couple_id uuid, visibility text not null default 'personal' check (visibility = 'personal'), is_deleted boolean);
      create table public.mood_entries(id uuid, owner_id uuid, couple_id uuid, visibility text, is_deleted boolean);
      create table public.daily_songs(id uuid, owner_id uuid, couple_id uuid);
      create table public.screen_notes(id uuid, owner_id uuid, couple_id uuid, is_deleted boolean, image_path text);
      create table public.travel_places(id uuid, owner_id uuid, couple_id uuid);
      create table public.couple_documents(id uuid, owner_id uuid, couple_id uuid);
      create table public.couple_document_links(id uuid, owner_id uuid, couple_id uuid);
      create table public.couple_gallery_photos(id uuid, owner_id uuid, couple_id uuid);
      create table public.couple_audio_memories(id uuid, owner_id uuid, couple_id uuid);
      do $$ declare rel record; begin
        for rel in select schemaname, tablename from pg_tables where schemaname in ('public','storage') loop
          execute format('alter table %I.%I enable row level security', rel.schemaname, rel.tablename);
        end loop;
      end $$;
      grant select, insert, update, delete on all tables in schema public to authenticated;
      grant select, insert, update, delete on storage.objects to authenticated;
      grant usage on schema storage to authenticated;
      create policy lists_select on public.lists for select to authenticated
        using (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)));
      create policy lists_update on public.lists for update to authenticated using (owner_id = auth.uid());
      create policy lists_delete on public.lists for delete to authenticated using (owner_id = auth.uid());
      create policy daily_songs_update on public.daily_songs for update to authenticated using (owner_id = auth.uid());
      create policy daily_songs_delete on public.daily_songs for delete to authenticated using (owner_id = auth.uid());
      create policy daily_songs_select on public.daily_songs for select to authenticated using (public.is_couple_member(couple_id));
      create policy gift_ideas_owner on public.gift_ideas for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
      create policy mood_entries_update on public.mood_entries for update to authenticated using (owner_id = auth.uid());
      create policy mood_entries_delete on public.mood_entries for delete to authenticated using (owner_id = auth.uid());
      create policy screen_notes_update on public.screen_notes for update to authenticated using (owner_id = auth.uid());
      create policy travel_places_delete on public.travel_places for delete to authenticated using (owner_id = auth.uid());
      create policy couple_documents_delete on public.couple_documents for delete to authenticated using (owner_id = auth.uid());
      create policy couple_document_links_delete on public.couple_document_links for delete to authenticated using (owner_id = auth.uid());
      create policy couple_gallery_photos_update on public.couple_gallery_photos for update to authenticated using (owner_id = auth.uid());
      create policy couple_gallery_photos_delete on public.couple_gallery_photos for delete to authenticated using (owner_id = auth.uid());
      create policy couple_audio_memories_delete on public.couple_audio_memories for delete to authenticated using (owner_id = auth.uid());
      create policy couple_documents_storage_delete on storage.objects for delete to authenticated using (false);
      create policy couple_gallery_storage_delete on storage.objects for delete to authenticated using (false);
      create policy couple_audio_memories_storage_delete on storage.objects for delete to authenticated using (false);
      create policy screen_note_stickers_delete on storage.objects for delete to authenticated using (false);
      create policy storage_select on storage.objects for select to authenticated
        using (public.is_couple_member((storage.foldername(name))[1]::uuid));
    `);
    await db.exec(`
      insert into public.gift_ideas values ('33333333-3333-4333-8333-333333333333', '${partnerA}', '${coupleA}', 'personal', false);
      insert into public.lists values ('${coupleA}', '${partnerA}', '${coupleA}', 'personal', false);
    `);
    await db.exec(await migration('20261111_equal_shared_content_permissions'));
    await db.exec(`
      insert into public.lists values ('22222222-2222-4222-8222-222222222222', '${partnerA}', '${coupleA}', 'personal', false);
      insert into public.daily_songs values ('44444444-4444-4444-8444-444444444444', '${partnerA}', '${coupleA}');
      insert into storage.objects values ('couple-gallery', '${coupleA}/${partnerA}/photo.jpg');
    `);
    await db.exec(
      `set role authenticated; set request.user_id = '${partnerB}'; set request.couple_id = '${coupleA}'; set request.is_member = 'yes';`,
    );
    const sharedGift = await db.query(
      `select visibility from public.gift_ideas where id = '33333333-3333-4333-8333-333333333333'`,
    );
    assert.equal(sharedGift.rows[0]?.visibility, 'shared');
    const sharedLists = await db.query(`select id from public.lists where couple_id = '${coupleA}'`);
    assert.deepEqual(
      sharedLists.rows.map((row) => row.id),
      [coupleA],
    );
    await db.exec(`update public.lists set is_deleted = true where id = '${coupleA}';`);
    await assert.rejects(
      db.exec(`update public.lists set owner_id = '${partnerB}' where id = '${coupleA}';`),
      /ekleyen bilgisi değiştirilemez/,
    );
    await db.exec(`delete from public.daily_songs where id = '44444444-4444-4444-8444-444444444444';`);
    await db.exec(
      `update public.gift_ideas set is_deleted = true where id = '33333333-3333-4333-8333-333333333333';`,
    );
    await db.exec(`delete from storage.objects where bucket_id = 'couple-gallery';`);
    await db.exec("set request.is_member = 'no';");
    await db.exec(`update public.lists set is_deleted = false where id = '${coupleA}';`);
    await db.exec('reset role;');
    const result = await db.query(`select is_deleted from public.lists where id = '${coupleA}'`);
    assert.equal(result.rows[0].is_deleted, true);
    assert.equal((await db.query('select count(*)::int as count from public.daily_songs')).rows[0].count, 0);
    assert.equal(
      (await db.query('select visibility, is_deleted from public.gift_ideas')).rows[0].visibility,
      'shared',
    );
    assert.equal((await db.query('select count(*)::int as count from storage.objects')).rows[0].count, 0);
  } finally {
    await db.close();
  }
});
