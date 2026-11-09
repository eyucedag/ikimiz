import { documentService } from '@/src/services/documentService';
import { notificationService } from '@/src/services/notificationService';
import { supabase } from '@/src/lib/supabase';

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));
jest.mock('@/src/services/notificationService', () => ({
  notificationService: { notifyPartner: jest.fn() },
}));

const row = {
  id: 'document-1',
  owner_id: 'user-1',
  file_name: 'sample.pdf',
  display_name: 'sample.pdf',
  mime_type: 'application/pdf',
  storage_path: 'couple-1/user-1/sample.pdf',
  size_bytes: 4,
  created_at: '2026-11-08T12:00:00Z',
};

function insertBuilder(result: { data: typeof row | null; error: { code: string; message: string } | null }) {
  const builder = {} as { insert: jest.Mock; select: jest.Mock; single: jest.Mock };
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.select = jest.fn().mockReturnValue(builder);
  builder.single = jest.fn().mockResolvedValue(result);
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('PDF metadata saves on older installations without the optional display name column', async () => {
  const oldSchema = insertBuilder({
    data: null,
    error: { code: 'PGRST204', message: "Could not find the 'display_name' column" },
  });
  const compatible = insertBuilder({ data: row, error: null });
  const bucket = { upload: jest.fn().mockResolvedValue({ error: null }) };
  jest
    .mocked(supabase.from)
    .mockReturnValueOnce(oldSchema as never)
    .mockReturnValueOnce(compatible as never);
  jest.mocked(supabase.storage.from).mockReturnValue(bucket as never);

  const result = await documentService.add({
    ownerId: 'user-1',
    partnerId: 'partner-1',
    coupleId: 'couple-1',
    fileName: 'sample.pdf',
    displayName: 'sample.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 4,
    content: new Uint8Array([1, 2, 3, 4]).buffer,
  });

  expect(oldSchema.insert).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'sample.pdf' }));
  expect(compatible.insert).toHaveBeenCalledWith(
    expect.not.objectContaining({ display_name: expect.anything() }),
  );
  expect(result.displayName).toBe('sample.pdf');
  expect(notificationService.notifyPartner).toHaveBeenCalledTimes(1);
});

test('renaming a document updates the visible name only for its owner', async () => {
  const builder = {} as {
    update: jest.Mock;
    eq: jest.Mock;
    select: jest.Mock;
    maybeSingle: jest.Mock;
  };
  builder.update = jest.fn().mockReturnValue(builder);
  builder.eq = jest.fn().mockReturnValue(builder);
  builder.select = jest.fn().mockReturnValue(builder);
  builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'document-1' }, error: null });
  jest.mocked(supabase.from).mockReturnValue(builder as never);

  await documentService.rename('document-1', 'Kimlik belgeleri');

  expect(builder.update).toHaveBeenCalledWith({ display_name: 'Kimlik belgeleri' });
  expect(builder.eq).toHaveBeenCalledWith('id', 'document-1');
});
