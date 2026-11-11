import { categories, getCategoryColor } from '@/src/constants/categories';

describe('category color palette', () => {
  it('assigns the requested colors in visible category order', () => {
    const expected = [
      '#3D6796',
      '#93485F',
      '#346C59',
      '#BCBA67',
      '#66758C',
      '#62458A',
      '#A66F59',
      '#2C6E72',
      '#C9A1BF',
      '#2C3A65',
      '#68584D',
      '#706D69',
      '#8BB8C9',
      '#80935B',
    ];
    const visibleCategories = categories.filter((category) => category.slug !== 'opucuk');
    const visibleColors = [
      ...visibleCategories.map((category) => category.color),
      getCategoryColor('ruh-halim').color,
    ];

    expect(visibleCategories.map((category) => category.color)).toEqual(expected);
    expect(getCategoryColor('ruh-halim').color).toBe('#AEADD0');
    expect(new Set(visibleColors).size).toBe(15);
  });

  it('keeps kiss and upcoming tones aligned with the reference', () => {
    expect(getCategoryColor('opucuk').color).toBe('#93485F');
    expect(getCategoryColor('yaklasanlar').color).toBe('#414A56');
  });
});
