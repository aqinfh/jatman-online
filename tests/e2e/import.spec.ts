import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { samplePosts, wpCount } from './helpers';

const counts = () => [
  wpCount('post', 'list', '--post_type=post', '--meta_key=jatman_source_url', '--format=count'),
  wpCount('user', 'list', '--meta_key=jatman_imported', '--format=count'),
  wpCount('post', 'list', '--post_type=attachment', '--post_status=inherit', '--meta_key=jatman_source_url', '--format=count'),
];

test('impor sample idempotent dan lengkap', async () => {
  test.setTimeout(300_000);
  const before = counts();
  expect(before[0]).toBe(samplePosts().length);
  execFileSync('npm', ['run', 'sample:import'], { stdio: 'ignore' });
  expect(counts()).toEqual(before);
});
