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
