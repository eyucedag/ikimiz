import { categories, getCategoryColor } from '@/src/constants/categories';

describe('category color palette', () => {
  it('assigns the requested colors in visible category order', () => {
    const expected = [
      '#8B4A2F',
      '#3E4A32',
      '#8C5A32',
      '#34302E',
      '#2F4E50',
      '#5A3B2B',
      '#583847',
      '#5B602C',
      '#7A332A',
      '#4B413A',
      '#45515A',
      '#3F2A22',
      '#425337',
      '#6A2F27',
    ];
    const visibleCategories = categories.filter((category) => category.slug !== 'opucuk');
    const visibleColors = [
      ...visibleCategories.map((category) => category.color),
      getCategoryColor('ruh-halim').color,
    ];

    expect(visibleCategories.map((category) => category.color)).toEqual(expected);
    expect(getCategoryColor('ruh-halim').color).toBe('#4A2E3A');
    expect(new Set(visibleColors).size).toBe(15);
  });

  it('keeps kiss and upcoming tones within the new palette', () => {
    expect(getCategoryColor('opucuk').color).toBe('#7A332A');
    expect(getCategoryColor('yaklasanlar').color).toBe('#3E4A32');
  });
});
