const MANICURE_BASE_SERVICE = {
  id: 'manicure_base',
  title: 'Маникюр (Комплекс)',
  description: 'Аппаратный/комбинированный маникюр. Снятие и покрытие выбираются далее.',
  basePrice: 1000,
  duration: '1-2 ч',
  hasModifiers: true
};

export const SERVICES_CATEGORIES = [
  { id: 'nails', title: 'Маникюр & Педикюр', items: [MANICURE_BASE_SERVICE] },
  { id: 'solarium', title: 'Солярий', items: [] },
  { id: 'extra', title: 'Дополнительно', items: [] }
];

export const NAIL_MODIFIERS = {
  removal: {
    title: 'Снятие предыдущего покрытия',
    options: [
      { id: 'rem_none', label: 'Без снятия', price: 0 },
      { id: 'rem_mine', label: 'Снятие моей работы', price: 0 },
      { id: 'rem_other', label: 'Снятие чужой работы', price: 300 }
    ]
  },
  coating: {
    title: 'Покрытие',
    options: [
      { id: 'coat_none', label: 'Без покрытия', price: 0 },
      { id: 'coat_gel', label: 'Гель-лак (однотон)', price: 800 },
      { id: 'coat_hard', label: 'Укрепление гелем + цвет', price: 1200 }
    ]
  },
  design: {
    title: 'Дизайн',
    options: [
      { id: 'des_none', label: 'Без дизайна', price: 0 },
      { id: 'des_french', label: 'Френч', price: 500 },
      { id: 'des_complex', label: 'Сложный дизайн (на все пальцы)', price: 800 }
    ]
  }
};

export const SERVICES_DATA = [MANICURE_BASE_SERVICE];
