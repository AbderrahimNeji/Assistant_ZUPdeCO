export interface Department {
  code: string;
  name: string;
  postalCodePrefix: string[];
}

export const DEPARTMENTS: Department[] = [
  { code: '01', name: 'Ain', postalCodePrefix: ['01'] },
  { code: '02', name: 'Aisne', postalCodePrefix: ['02'] },
  { code: '03', name: 'Allier', postalCodePrefix: ['03'] },
  { code: '04', name: 'Alpes-de-Haute-Provence', postalCodePrefix: ['04'] },
  { code: '05', name: 'Hautes-Alpes', postalCodePrefix: ['05'] },
  { code: '06', name: 'Alpes-Maritimes', postalCodePrefix: ['06'] },
  { code: '07', name: 'Ardèche', postalCodePrefix: ['07'] },
  { code: '08', name: 'Ardennes', postalCodePrefix: ['08'] },
  { code: '09', name: 'Ariège', postalCodePrefix: ['09'] },
  { code: '10', name: 'Aube', postalCodePrefix: ['10'] },
  { code: '11', name: 'Aude', postalCodePrefix: ['11'] },
  { code: '12', name: 'Aveyron', postalCodePrefix: ['12'] },
  { code: '13', name: 'Bouches-du-Rhône', postalCodePrefix: ['13'] },
  { code: '14', name: 'Calvados', postalCodePrefix: ['14'] },
  { code: '15', name: 'Cantal', postalCodePrefix: ['15'] },
  { code: '16', name: 'Charente', postalCodePrefix: ['16'] },
  { code: '17', name: 'Charente-Maritime', postalCodePrefix: ['17'] },
  { code: '18', name: 'Cher', postalCodePrefix: ['18'] },
  { code: '19', name: 'Corrèze', postalCodePrefix: ['19'] },
  { code: '21', name: "Côte-d'Or", postalCodePrefix: ['21'] },
  { code: '22', name: "Côtes-d'Armor", postalCodePrefix: ['22'] },
  { code: '23', name: 'Creuse', postalCodePrefix: ['23'] },
  { code: '24', name: 'Dordogne', postalCodePrefix: ['24'] },
  { code: '25', name: 'Doubs', postalCodePrefix: ['25'] },
  { code: '26', name: 'Drôme', postalCodePrefix: ['26'] },
  { code: '27', name: 'Eure', postalCodePrefix: ['27'] },
  { code: '28', name: 'Eure-et-Loir', postalCodePrefix: ['28'] },
  { code: '29', name: 'Finistère', postalCodePrefix: ['29'] },
  { code: '2A', name: 'Corse-du-Sud', postalCodePrefix: ['20'] },
  { code: '2B', name: 'Haute-Corse', postalCodePrefix: ['20'] },
  { code: '30', name: 'Gard', postalCodePrefix: ['30'] },
  { code: '31', name: 'Haute-Garonne', postalCodePrefix: ['31'] },
  { code: '32', name: 'Gers', postalCodePrefix: ['32'] },
  { code: '33', name: 'Gironde', postalCodePrefix: ['33'] },
  { code: '34', name: 'Hérault', postalCodePrefix: ['34'] },
  { code: '35', name: 'Ille-et-Vilaine', postalCodePrefix: ['35'] },
  { code: '36', name: 'Indre', postalCodePrefix: ['36'] },
  { code: '37', name: 'Indre-et-Loire', postalCodePrefix: ['37'] },
  { code: '38', name: 'Isère', postalCodePrefix: ['38'] },
  { code: '39', name: 'Jura', postalCodePrefix: ['39'] },
  { code: '40', name: 'Landes', postalCodePrefix: ['40'] },
  { code: '41', name: 'Loir-et-Cher', postalCodePrefix: ['41'] },
  { code: '42', name: 'Loire', postalCodePrefix: ['42'] },
  { code: '43', name: 'Haute-Loire', postalCodePrefix: ['43'] },
  { code: '44', name: 'Loire-Atlantique', postalCodePrefix: ['44'] },
  { code: '45', name: 'Loiret', postalCodePrefix: ['45'] },
  { code: '46', name: 'Lot', postalCodePrefix: ['46'] },
  { code: '47', name: 'Lot-et-Garonne', postalCodePrefix: ['47'] },
  { code: '48', name: 'Lozère', postalCodePrefix: ['48'] },
  { code: '49', name: 'Maine-et-Loire', postalCodePrefix: ['49'] },
  { code: '50', name: 'Manche', postalCodePrefix: ['50'] },
  { code: '51', name: 'Marne', postalCodePrefix: ['51'] },
  { code: '52', name: 'Haute-Marne', postalCodePrefix: ['52'] },
  { code: '53', name: 'Mayenne', postalCodePrefix: ['53'] },
  { code: '54', name: 'Meurthe-et-Moselle', postalCodePrefix: ['54'] },
  { code: '55', name: 'Meuse', postalCodePrefix: ['55'] },
  { code: '56', name: 'Morbihan', postalCodePrefix: ['56'] },
  { code: '57', name: 'Moselle', postalCodePrefix: ['57'] },
  { code: '58', name: 'Nièvre', postalCodePrefix: ['58'] },
  { code: '59', name: 'Nord', postalCodePrefix: ['59'] },
  { code: '60', name: 'Oise', postalCodePrefix: ['60'] },
  { code: '61', name: 'Orne', postalCodePrefix: ['61'] },
  { code: '62', name: 'Pas-de-Calais', postalCodePrefix: ['62'] },
  { code: '63', name: 'Puy-de-Dôme', postalCodePrefix: ['63'] },
  { code: '64', name: 'Pyrénées-Atlantiques', postalCodePrefix: ['64'] },
  { code: '65', name: 'Hautes-Pyrénées', postalCodePrefix: ['65'] },
  { code: '66', name: 'Pyrénées-Orientales', postalCodePrefix: ['66'] },
  { code: '67', name: 'Bas-Rhin', postalCodePrefix: ['67'] },
  { code: '68', name: 'Haut-Rhin', postalCodePrefix: ['68'] },
  { code: '69', name: 'Rhône', postalCodePrefix: ['69'] },
  { code: '70', name: 'Haute-Saône', postalCodePrefix: ['70'] },
  { code: '71', name: 'Saône-et-Loire', postalCodePrefix: ['71'] },
  { code: '72', name: 'Sarthe', postalCodePrefix: ['72'] },
  { code: '73', name: 'Savoie', postalCodePrefix: ['73'] },
  { code: '74', name: 'Haute-Savoie', postalCodePrefix: ['74'] },
  { code: '75', name: 'Paris', postalCodePrefix: ['75'] },
  { code: '76', name: 'Seine-Maritime', postalCodePrefix: ['76'] },
  { code: '77', name: 'Seine-et-Marne', postalCodePrefix: ['77'] },
  { code: '78', name: 'Yvelines', postalCodePrefix: ['78'] },
  { code: '79', name: 'Deux-Sèvres', postalCodePrefix: ['79'] },
  { code: '80', name: 'Somme', postalCodePrefix: ['80'] },
  { code: '81', name: 'Tarn', postalCodePrefix: ['81'] },
  { code: '82', name: 'Tarn-et-Garonne', postalCodePrefix: ['82'] },
  { code: '83', name: 'Var', postalCodePrefix: ['83'] },
  { code: '84', name: 'Vaucluse', postalCodePrefix: ['84'] },
  { code: '85', name: 'Vendée', postalCodePrefix: ['85'] },
  { code: '86', name: 'Vienne', postalCodePrefix: ['86'] },
  { code: '87', name: 'Haute-Vienne', postalCodePrefix: ['87'] },
  { code: '88', name: 'Vosges', postalCodePrefix: ['88'] },
  { code: '89', name: 'Yonne', postalCodePrefix: ['89'] },
  { code: '90', name: 'Territoire de Belfort', postalCodePrefix: ['90'] },
  { code: '91', name: 'Essonne', postalCodePrefix: ['91'] },
  { code: '92', name: 'Hauts-de-Seine', postalCodePrefix: ['92'] },
  { code: '93', name: 'Seine-Saint-Denis', postalCodePrefix: ['93'] },
  { code: '94', name: 'Val-de-Marne', postalCodePrefix: ['94'] },
  { code: '95', name: "Val-d'Oise", postalCodePrefix: ['95'] },
  { code: '971', name: 'Guadeloupe', postalCodePrefix: ['971'] },
  { code: '972', name: 'Martinique', postalCodePrefix: ['972'] },
  { code: '973', name: 'Guyane', postalCodePrefix: ['973'] },
  { code: '974', name: 'La Réunion', postalCodePrefix: ['974'] },
  { code: '976', name: 'Mayotte', postalCodePrefix: ['976'] },
];

export const getDepartmentByCode = (code: string): Department | undefined => {
  return DEPARTMENTS.find((d) => d.code === code);
};

export const getDepartmentByPostalCode = (postalCode: string): Department | undefined => {
  if (!postalCode || postalCode.length < 2) return undefined;

  const prefix = postalCode.substring(0, 2);

  if (prefix === '20') {
    if (postalCode >= '20000' && postalCode <= '20199') {
      return DEPARTMENTS.find((d) => d.code === '2A');
    } else if (postalCode >= '20200' && postalCode <= '20620') {
      return DEPARTMENTS.find((d) => d.code === '2B');
    }
  }

  if (
    postalCode.startsWith('971') ||
    postalCode.startsWith('972') ||
    postalCode.startsWith('973') ||
    postalCode.startsWith('974') ||
    postalCode.startsWith('976')
  ) {
    const prefix3 = postalCode.substring(0, 3);
    return DEPARTMENTS.find((d) => d.code === prefix3);
  }

  return DEPARTMENTS.find((d) => d.postalCodePrefix.includes(prefix));
};
