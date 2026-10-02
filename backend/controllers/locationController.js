const db = require('../config/db');

exports.getIslandGroups = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ph_island_groups ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRegions = async (req, res) => {
  try {
    const { islandGroupId } = req.query;
    let query = 'SELECT * FROM ph_regions';
    let params = [];
    if (islandGroupId) {
      query += ' WHERE island_group_id = ?';
      params.push(islandGroupId);
    }
    query += ' ORDER BY name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProvinces = async (req, res) => {
  try {
    const { regionId } = req.query;
    let query = 'SELECT * FROM ph_provinces';
    let params = [];
    if (regionId) {
      query += ' WHERE region_id = ?';
      params.push(regionId);
    }
    query += ' ORDER BY name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCitiesMunicipalities = async (req, res) => {
  try {
    const { provinceId, regionId } = req.query;
    let query = 'SELECT * FROM ph_cities_municipalities WHERE 1=1';
    let params = [];
    
    if (provinceId) {
      query += ' AND province_id = ?';
      params.push(provinceId);
    } else if (regionId) {
      // For NCR
      query += ' AND region_id = ? AND province_id IS NULL';
      params.push(regionId);
    }
    
    query += ' ORDER BY name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBarangays = async (req, res) => {
  try {
    const { cityMunicipalityId } = req.query;
    let query = 'SELECT * FROM ph_barangays';
    let params = [];
    if (cityMunicipalityId) {
      query += ' WHERE city_municipality_id = ?';
      params.push(cityMunicipalityId);
    }
    query += ' ORDER BY name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resolveLocationNames = async (req, res) => {
  try {
    const { islandGroup, region, province, city, barangay } = req.query;
    
    let result = {
      islandGroup: '',
      region: '',
      province: '',
      city: '',
      barangay: ''
    };

    if (islandGroup) {
      const [r] = await db.query('SELECT name FROM ph_island_groups WHERE id = ?', [islandGroup]);
      if (r.length) result.islandGroup = r[0].name;
    }
    if (region) {
      const [r] = await db.query('SELECT name FROM ph_regions WHERE id = ?', [region]);
      if (r.length) result.region = r[0].name;
    }
    if (province) {
      const [r] = await db.query('SELECT name FROM ph_provinces WHERE id = ?', [province]);
      if (r.length) result.province = r[0].name;
    }
    if (city) {
      const [r] = await db.query('SELECT name FROM ph_cities_municipalities WHERE id = ?', [city]);
      if (r.length) result.city = r[0].name;
    }
    if (barangay) {
      const [r] = await db.query('SELECT name FROM ph_barangays WHERE id = ?', [barangay]);
      if (r.length) result.barangay = r[0].name;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
