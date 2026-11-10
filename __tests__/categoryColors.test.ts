import { categories, getCategoryColor } from '@/src/constants/categories';

describe('category color palette', () => {
  it('assigns the requested colors in visible category order', () => {
    const expected = [
      '#2F718C',
      '#DA7055',
      '#75864D',
      '#A78350',
      '#368589',
      '#5C9AB4',
      '#886C9C',
      '#89934E',
      '#B45258',
      '#B9793F',
      '#527A96',
      '#657D75',
      '#4F8262',
      '#CD765F',
    ];
    const visibleCategories = categories.filter((category) => category.slug !== 'opucuk');
    const visibleColors = [
      ...visibleCategories.map((category) => category.color),
      getCategoryColor('ruh-halim').color,
    ];

    expect(visibleCategories.map((category) => category.color)).toEqual(expected);
    expect(getCategoryColor('ruh-halim').color).toBe('#805A78');
    expect(new Set(visibleColors).size).toBe(15);
  });

  it('keeps kiss and upcoming tones within the new palette', () => {
    expect(getCategoryColor('opucuk').color).toBe('#B45258');
    expect(getCategoryColor('yaklasanlar').color).toBe('#DA7055');
  });
});
