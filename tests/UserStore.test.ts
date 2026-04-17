import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { UserStore } from '../app/services/UserStore';

let store: UserStore;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `hass-odps-test-${Date.now()}.sqlite`);
  store = new UserStore(dbPath);
});

afterEach(() => {
  store.close();
  fs.unlinkSync(dbPath);
});

describe('UserStore.createUser', () => {
  it('returns true on first registration', () => {
    expect(store.createUser('alice', 'secret')).toBe(true);
  });

  it('returns false on duplicate username', () => {
    store.createUser('alice', 'secret');
    expect(store.createUser('alice', 'other')).toBe(false);
  });
});

describe('UserStore.authenticate', () => {
  beforeEach(() => store.createUser('alice', 'secret'));

  it('returns true with correct MD5 key', () => {
    const key = UserStore.hashPassword('secret');
    expect(store.authenticate('alice', key)).toBe(true);
  });

  it('returns false with wrong key', () => {
    expect(store.authenticate('alice', 'wronghash')).toBe(false);
  });

  it('returns false for unknown user', () => {
    const key = UserStore.hashPassword('secret');
    expect(store.authenticate('nobody', key)).toBe(false);
  });
});

describe('UserStore.saveProgress + getProgress', () => {
  beforeEach(() => store.createUser('alice', 'secret'));

  it('retrieves saved progress', () => {
    store.saveProgress('alice', {
      document: 'abc123',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
    });
    const p = store.getProgress('alice', 'abc123');
    expect(p).not.toBeNull();
    expect(p!.progress).toBe('/body/DocFragment[5]');
    expect(p!.percentage).toBeCloseTo(0.42);
  });

  it('updates existing progress on conflict', () => {
    store.saveProgress('alice', {
      document: 'abc123',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
    });
    store.saveProgress('alice', {
      document: 'abc123',
      progress: '/body/DocFragment[10]',
      percentage: 0.8,
      device: 'Kobo',
      device_id: 'dev-1',
    });
    const p = store.getProgress('alice', 'abc123');
    expect(p!.percentage).toBeCloseTo(0.8);
  });

  it('returns null when no progress exists', () => {
    expect(store.getProgress('alice', 'unknown')).toBeNull();
  });
});
