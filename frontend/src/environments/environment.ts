export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  /**
   * Clave de CARTO para el mapa base Positron (https://carto.com/basemaps/apikey).
   * Es pública (viaja en las URLs de los mosaicos): restringila a tu dominio en el panel de CARTO.
   * Vacía: se usa el mapa estándar de OpenStreetMap.
   */
  cartoApiKey: 'cb1_5ejt_1_e2d530d3deb6f413a9e66f09',
};
