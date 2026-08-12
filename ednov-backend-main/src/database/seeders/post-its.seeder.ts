import { DataSource } from 'typeorm';
import * as postItsData from './data/post-its.json';
import * as sharesData from './data/post-it-shares.json';

export async function seedPostIts(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding post-its...');

  const items = Array.isArray(postItsData) ? postItsData : [];

  if (items.length === 0) {
    console.log('⚠️  No post-its data found');
    return;
  }

  try {
    for (const item of items) {
      await ds.query(
        `INSERT INTO post_its (
          id, company_id, created_by_id, title, thematic, content,
          deadline, status, color, is_archived, is_priority,
          visible_from, is_default, default_post_it_key,
          created_at, updated_at, deleted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.company_id,
          item.created_by_id,
          item.title,
          item.thematic,
          item.content,
          item.deadline ?? null,
          item.status,
          item.color,
          item.is_archived,
          item.is_priority,
          item.visible_from ?? null,
          item.is_default ?? false,
          item.default_post_it_key ?? null,
          item.created_at,
          item.updated_at,
          item.deleted_at ?? null,
        ],
      );
    }

    console.log(`✅ Inserted ${items.length} post-its`);
  } catch (error) {
    console.error('❌ Error seeding post-its:', error);
    throw error;
  }

  await seedPostItShares(ds);
}

async function seedPostItShares(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding post-it-shares...');

  const shares = Array.isArray(sharesData) ? sharesData : [];

  if (shares.length === 0) {
    console.log('⚠️  No post-it-shares data found');
    return;
  }

  try {
    for (const share of shares) {
      await ds.query(
        `INSERT INTO post_it_shares (
          id, post_it_id, user_id, permission, shared_at, shared_by_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (post_it_id, user_id) DO NOTHING`,
        [
          share.id,
          share.post_it_id,
          share.user_id,
          share.permission,
          share.shared_at,
          share.shared_by_id,
          share.created_at,
          share.updated_at,
        ],
      );
    }

    console.log(`✅ Inserted ${shares.length} post-it-shares`);
  } catch (error) {
    console.error('❌ Error seeding post-it-shares:', error);
    throw error;
  }
}
