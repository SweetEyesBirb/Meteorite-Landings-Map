
function main() {

  let map;
  const submitBtn = document.getElementById("submit");
  const clusters = L.markerClusterGroup();

  /**
   * The function `fetchDataFromAPI` fetches data from a NASA API in batches and returns a promise that
   * resolves to an array of all the fetched data.
   * @returns The function `fetchDataFromAPI` returns a promise that resolves to an array of data fetched
   * from the NASA API.
   */
  async function fetchDataFromAPI() {
      let fetchDataPromise; // Variable to store the ongoing fetch request
      // Check if the fetch request is already in progress, and return the existing promise
      if (fetchDataPromise) {
          return fetchDataPromise;
      }
      const baseUrl = 'https://data.nasa.gov/resource/gh4g-9sfh.json';
      const perPage = 1000;
      let currentPage = 1;
      let allData = [];

      while (true) {
          const url = `${baseUrl}?$limit=${perPage}&$offset=${(currentPage - 1) * perPage}`;
          try {
              const response = await fetch(url);
              const data = await response.json();
              if (data.length === 0) {
                  break;
              }
              allData = allData.concat(data);
              currentPage++;
          } catch (error) {
              console.error('Error fetching data:', error);
              break;
          }
      }
      fetchDataPromise = Promise.resolve(allData); // Store the promise so subsequent calls return the same promise
      return allData;
  }

  async function initMap() {
      const positionStart = { lat: 45, lng: 13 };
      map = L.map("map").setView(positionStart, 3);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 20,
          attribution: '© OpenStreetMap'
      }).addTo(map);
  }
  initMap();

  /**
   * The function `isValidCoordinate` checks if a given coordinate is valid based on whether it is a
   * latitude or longitude.
   * @param coord - The `coord` parameter represents the coordinate value that needs to be validated. It
   * can be any number.
   * @param [isLatitude=true] - The `isLatitude` parameter is a boolean value that determines whether the
   * coordinate being checked is a latitude or a longitude. If `isLatitude` is `true`, the function will
   * check if the coordinate is within the range of -90 to 90 (inclusive), which is the valid range for
   * latitude
   * @returns The function `isValidCoordinate` returns a boolean value. It returns `true` if the `coord`
   * value is a valid latitude or longitude coordinate, depending on the value of the `isLatitude`
   * parameter. It returns `false` if the `coord` value is not a number or if it is outside the valid
   * range for latitude or longitude.
   */
  function isValidCoordinate(coord, isLatitude = true) {
      if (typeof coord !== 'number' || isNaN(coord)) {
          return false;
      }
      if (isLatitude) {
          return Math.abs(coord) <= 90;
      } else {
          return Math.abs(coord) <= 180;
      }
  }

  /**
   * The function `renderData` fetches data from an API, processes it, and adds markers with popups to a
   * map.
   */
  async function renderData(data) {

      clusters.clearLayers();

      data.forEach(landing => {
          const lat = parseFloat(landing.geolocation?.latitude);
          const lng = parseFloat(landing.geolocation?.longitude);

          if (lat && lng && isValidCoordinate(lat) && isValidCoordinate(lng, false)) {
              const coords = { lat, lng };
              const marker = L.marker(coords);

              const html = `<h2>Name: ${landing.name}</h2>
        <h3>Mass (Kg): ${landing.mass ? parseInt(landing.mass) / 1000 : "No Data"}</h3>
        <h3>${landing.fall} in year: ${landing.year ? parseInt((landing.year).substring(0, 4), 10) : "Unknown"}</h3>
        <h3>Coordinates: Lat: ${coords.lat} Lng: ${coords.lng}</h3>
        <h3>Class: ${landing.recclass}</h3>`;

              marker.bindPopup(html);
              marker.bindTooltip(html);
              clusters.addLayer(marker);
          }
      });
      map.addLayer(clusters);
  }

  /**
* The function `renderAllData` fetches data and then renders it, handling any errors that occur.
*/
  function renderAllData() {
      fetchDataFromAPI().then(allData => {
          renderData(allData);
      })
          .catch(error => {
              console.error("Error is: " + error);
          });
  }

  /**
   * The `filterMap` function filters and maps data based on given criteria and displays the results on a
   * map.
   * @param lMass - The parameter `lMass` represents the lower limit of the mass of the landing. It is a
   * number that specifies the minimum mass value for filtering the data.
   * @param hMass - The parameter `hMass` represents the upper limit of the mass of a landing. It is a
   * numeric value that specifies the maximum mass in kilograms.
   * @param fYear - The `fYear` parameter represents the starting year for filtering the data. It is used
   * to filter out data points that have a year value lower than the specified `fYear`.
   * @param tYear - The parameter `tYear` represents the upper limit of the year range for filtering the
   * data. It is a number that specifies the maximum year value.
   */
  async function filterMap(lMass, hMass, fYear, tYear) {
      lMass = lMass ? parseFloat(lMass) : 0;
      hMass = hMass ? parseFloat(hMass) : 60000;
      fYear = fYear ? parseInt(fYear) : 0;
      tYear = tYear ? parseInt(tYear) : 2013;
      // console.log("Input values:", lMass, hMass, fYear, tYear);

      const newAllData = await fetchDataFromAPI();
      // console.log("Raw data:", newAllData);

      let filteredData = newAllData.filter(landing => {

          const massLow = landing.mass ? (parseInt(landing.mass) / 1000) : 0;
          const massHigh = landing.mass ? (parseInt(landing.mass) / 1000) : 60000;
          const yearLow = landing.year ? parseInt(landing.year?.substring(0, 4), 10) : 860;
          const yearHigh = landing.year ? parseInt(landing.year?.substring(0, 4), 10) : 2013;

          return massLow >= lMass && massHigh <= hMass && yearLow >= fYear && yearHigh <= tYear;
      });
      return filteredData;
  }

  // click event
  submitBtn.addEventListener("click", async (event) => {

      event.preventDefault();
      try {
          let lowerMassValue = document.getElementById("mass-low").value;
          let higherMassValue = document.getElementById("mass-high").value;
          let yearFrom = document.getElementById("year-from").value;
          let yearTo = document.getElementById("year-to").value;

          const filteredObjects = await filterMap(lowerMassValue, higherMassValue, yearFrom, yearTo);
          renderData(filteredObjects);
      } catch (error) {
          console.error("error is: " + error);
      }

      submitBtn.disabled = true;
      setTimeout(function () {
          submitBtn.disabled = false;
      }, 2000);

  });

  // renders all the data when page is loaded
  window.onload = () => {
      renderAllData();
  }
}

main();