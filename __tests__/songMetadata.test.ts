import { parseSongMetadata } from '@/src/services/songMetadataService';

test('Spotify metadata maps the track title and artist', () => {
  expect(parseSongMetadata('spotify', { title: 'Dreams', author_name: 'Fleetwood Mac' }))
    .toEqual({ title: 'Dreams', artist: 'Fleetwood Mac' });
});

test('YouTube titles with artist separators identify the artist and song', () => {
  expect(parseSongMetadata('youtube', { title: 'Mabel Matiz - A Canım', author_name: 'Mabel Matiz' }))
    .toEqual({ title: 'A Canım', artist: 'Mabel Matiz' });
  expect(parseSongMetadata('youtube', { title: 'Duman - Seni Kendime Sakladım' }))
    .toEqual({ title: 'Seni Kendime Sakladım', artist: 'Duman' });
});

test('missing artist metadata leaves the fields for manual entry', () => {
  expect(parseSongMetadata('apple', { title: 'Song' })).toBeNull();
});
