const express = require('express');
const router = express.Router();
const {
  getIslandGroups,
  getRegions,
  getProvinces,
  getCitiesMunicipalities,
  getBarangays,
  resolveLocationNames
} = require('../controllers/locationController');

router.get('/island-groups', getIslandGroups);
router.get('/regions', getRegions);
router.get('/provinces', getProvinces);
router.get('/cities-municipalities', getCitiesMunicipalities);
router.get('/barangays', getBarangays);
router.get('/resolve', resolveLocationNames);

module.exports = router;
