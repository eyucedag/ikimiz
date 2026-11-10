import { categories, getCategoryColor } from '@/src/constants/categories';

describe('category color palette', () => {
  it('assigns the requested colors in visible category order', () => {
    const expected = [
      '#34302E',
      '#4B413A',
      '#3F2A22',
      '#5A3B2B',
      '#8B4A2F',
      '#7A332A',
      '#6A2F27',
      '#8C5A32',
      '#5B602C',
      '#425337',
      '#3E4A32',
      '#2F4E50',
      '#45515A',
      '#583847',
    ];
    const visibleCategories = categories.filter((category) => category.slug !== 'opucuk');

    expect(visibleCategories.map((category) => category.color)).toEqual(expected);
    expect(getCategoryColor('ruh-halim').color).toBe('#4A2E3A');
  });

  it('keeps kiss and upcoming tones within the new palette', () => {
    expect(getCategoryColor('opucuk').color).toBe('#7A332A');
    expect(getCategoryColor('yaklasanlar').color).toBe('#4B413A');
  });
});
