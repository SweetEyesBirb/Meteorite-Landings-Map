
function main() {

  let map;
  const submitBtn = document.getElementById("submit");
  const typeFilterSelect = document.getElementById("type-filter");
  const clusters = L.markerClusterGroup();

  /**
   * The function `fetchDataFromAPI` fetches data from a NASA API in batches and returns a promise that
   * resolves to an array of all the fetched data.
   * @returns The function `fetchDataFromAPI` returns a promise that resolves to an array of data fetched
   * from the NASA API.
   */
  let fetchDataPromise = null;

  function parseCSV(text) {
      const rows = [];
      let currentRow = [];
      let currentValue = "";
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
              if (inQuotes && nextChar === '"') {
                  currentValue += '"';
                  i++;
              } else {
                  inQuotes = !inQuotes;
              }
              continue;
          }

          if (char === ',' && !inQuotes) {
              currentRow.push(currentValue);
              currentValue = "";
              continue;
          }

          if ((char === '\n' || char === '\r') && !inQuotes) {
              if (char === '\r' && nextChar === '\n') {
                  i++;
              }
              currentRow.push(currentValue);
              if (currentRow.some(value => value.trim() !== "")) {
                  rows.push(currentRow);
              }
              currentRow = [];
              currentValue = "";
              continue;
          }

          currentValue += char;
      }

      if (currentValue.length > 0 || currentRow.length > 0) {
          currentRow.push(currentValue);
          if (currentRow.some(value => value.trim() !== "")) {
              rows.push(currentRow);
          }
      }

      if (rows.length === 0) {
          return [];
      }

      const headers = rows[0].map(header => header.trim());
      return rows.slice(1).map(row => {
          const record = {};
          headers.forEach((header, index) => {
              record[header] = row[index] !== undefined ? row[index].trim() : "";
          });
          return record;
      });
  }

  async function fetchDataFromAPI() {
      if (fetchDataPromise) {
          return fetchDataPromise;
      }

      fetchDataPromise = fetch("data/meteoritical_bulletin_data_final.csv")
          .then(async response => {
              if (!response.ok) {
                  throw new Error(`Failed to fetch local CSV: ${response.status}`);
              }

              const csvText = await response.text();
              const parsedRows = parseCSV(csvText);

              logCoordinateSummary(parsedRows, "Before CSV filtering");

              const mappedRows = parsedRows
                  .filter(row => row.Name && row.Latitude && row.Longitude)
                  .map(row => ({
                      name: row.Name,
                      place: row.Place || "Unknown",
                      fall: row.Fall || "Unknown",
                      year: row.Year || "",
                      mass: row["Mass(kg)"] || "",
                      type: row.Type || "Unknown",
                      recclass: row.Type || "Unknown",
                      link: row.Link || "",
                      geolocation: {
                          latitude: parseFloat(row.Latitude),
                          longitude: parseFloat(row.Longitude)
                      }
                  }));

              logCoordinateSummary(mappedRows, "After CSV filtering");
              return mappedRows;
          });

      return fetchDataPromise;
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

  function formatMassKg(massValue) {
      if (massValue === null || massValue === undefined || massValue === "") {
          return "No Data";
      }

      const mass = Number.parseFloat(massValue);
      if (!Number.isFinite(mass)) {
          return "No Data";
      }

      return `${mass} Kg`;
  }

  function normalizeYearValue(yearValue) {
      if (yearValue === null || yearValue === undefined || yearValue === "") {
          return null;
      }

      const raw = String(yearValue).trim();
      if (!raw) {
          return null;
      }

      if (/Ma\b/i.test(raw)) {
          const strictMatch = raw.match(/<\s*(\d+(?:\.\d+)?)/i)
              || raw.match(/(\d+(?:\.\d+)?)\s*(?:±|\+)\s*\d+\s*Ma/i)
              || raw.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*Ma/i)
              || raw.match(/(\d+(?:\.\d+)?)\s*Ma/i);

          if (!strictMatch) {
              return null;
          }

          const firstNumber = Number.parseFloat(strictMatch[1] || strictMatch[0]);
          return Number.isFinite(firstNumber) ? firstNumber : null;
      }

      const rangeMatch = raw.match(/(\d{4})\s*[-–]\s*(\d{4})/);
      if (rangeMatch) {
          return Number.parseFloat(rangeMatch[1]);
      }

      const singleYearMatch = raw.match(/(\d{4})/);
      if (singleYearMatch) {
          return Number.parseFloat(singleYearMatch[1]);
      }

      return null;
  }

  function formatYearValue(yearValue) {
      if (!yearValue) {
          return "Unknown";
      }

      const raw = String(yearValue).trim();
      return raw || "Unknown";
  }

  function logCoordinateSummary(data, label = "Dataset") {
      const totalRows = data.length;

      const nullOrEmpty = data.filter(landing => {
          const lat = landing.geolocation ? landing.geolocation.latitude : landing.Latitude;
          const lng = landing.geolocation ? landing.geolocation.longitude : landing.Longitude;
          return lat == null || lng == null || String(lat).trim() === "" || String(lng).trim() === "";
      }).length;

      const invalidCluster = data.filter(landing => {
          const lat = landing.geolocation ? landing.geolocation.latitude : landing.Latitude;
          const lng = landing.geolocation ? landing.geolocation.longitude : landing.Longitude;
          return String(lat) === "-71.500000" && String(lng) === "35.666670";
      }).length;

      const usable = data.filter(landing => {
          const latValue = landing.geolocation ? landing.geolocation.latitude : landing.Latitude;
          const lngValue = landing.geolocation ? landing.geolocation.longitude : landing.Longitude;
          const lat = Number.parseFloat(latValue);
          const lng = Number.parseFloat(lngValue);

          return Number.isFinite(lat) && Number.isFinite(lng) && isValidCoordinate(lat) && isValidCoordinate(lng, false);
      }).length;

      console.log(`${label} summary:`, {
          totalRows,
          rowsWithNullOrEmptyCoordinates: nullOrEmpty,
          rowsWithInvalidClusterCoordinates: invalidCluster,
          rowsWithUsableCoordinates: usable,
          rowsRendered: usable
      });
  }

  function populateTypeFilterOptions(data) {
      if (!typeFilterSelect) {
          return;
      }

      const selectedValue = typeFilterSelect.value || "all";
      const uniqueTypes = [...new Set(data
          .map(entry => entry.type)
          .filter(type => type && type.trim() !== ""))]
          .sort((a, b) => a.localeCompare(b));

      typeFilterSelect.innerHTML = "";

      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All Types / Classes";
      typeFilterSelect.appendChild(allOption);

      uniqueTypes.forEach(type => {
          const option = document.createElement("option");
          option.value = type;
          option.textContent = type;
          typeFilterSelect.appendChild(option);
      });

      if (uniqueTypes.includes(selectedValue)) {
          typeFilterSelect.value = selectedValue;
      } else {
          typeFilterSelect.value = "all";
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

          if (Number.isFinite(lat) && Number.isFinite(lng) && isValidCoordinate(lat) && isValidCoordinate(lng, false)) {
              const coords = { lat, lng };
              const marker = L.marker(coords);

              const linkHtml = landing.link
                  ? `<a href="${landing.link}" target="_blank" rel="noopener noreferrer">Meteoritical Bulletin Link</a>`
                  : "No bulletin link available";

              const isAgeBasedRecord = landing.type === "Impact Crater" || /Ma\b/i.test(String(landing.year || ""));
              const dateTitle = isAgeBasedRecord ? "Age" : "Year";
              const dateValue = isAgeBasedRecord ? formatYearValue(landing.year) : (landing.year ? parseInt((landing.year).substring(0, 4), 10) : "Unknown");

              const html = `<h2>Name: ${landing.name}</h2>
        <h3>Place: ${landing.place}</h3>
        <h3>Mass: ${formatMassKg(landing.mass)}</h3>
        <h3>${landing.fall} in ${dateTitle.toLowerCase()}: ${dateValue}</h3>
        <h3>Coordinates: Lat: ${coords.lat} Lng: ${coords.lng}</h3>
        <h3>Type / Class: ${landing.recclass}</h3>
        <h3>${linkHtml}</h3>`;

              marker.bindPopup(html);
              marker.bindTooltip(`<strong>${landing.name}</strong><br>Place: ${landing.place}<br>${linkHtml}`);
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
          populateTypeFilterOptions(allData);
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
  async function filterMap(lMass, hMass, fYear, tYear, selectedType = "all") {
      lMass = lMass ? parseFloat(lMass) : 0;
      hMass = hMass ? parseFloat(hMass) : 60000;
      fYear = fYear ? parseInt(fYear) : 0;
      tYear = tYear ? parseInt(tYear) : 2024;
      const normalizedType = selectedType && selectedType !== "all" ? selectedType.trim() : "";
      // console.log("Input values:", lMass, hMass, fYear, tYear);

      const newAllData = await fetchDataFromAPI();
      logCoordinateSummary(newAllData, "Before map filter");
      // console.log("Raw data:", newAllData);

      let filteredData = newAllData.filter(landing => {

          const massKg = landing.mass ? Number.parseFloat(landing.mass) : 0;
          const isAgeBasedRecord = landing.type === "Impact Crater" || /Ma\b/i.test(String(landing.year || ""));
          const comparableYear = normalizeYearValue(landing.year);

          const passesYear = isAgeBasedRecord
              ? true
              : comparableYear !== null && comparableYear >= fYear && comparableYear <= tYear;

          const passesType = !normalizedType || landing.type?.toLowerCase() === normalizedType.toLowerCase();

          return massKg >= lMass && massKg <= hMass && passesYear && passesType;
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
          let selectedType = typeFilterSelect ? typeFilterSelect.value : "all";

          const filteredObjects = await filterMap(lowerMassValue, higherMassValue, yearFrom, yearTo, selectedType);
          logCoordinateSummary(filteredObjects, "After filterMap");
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