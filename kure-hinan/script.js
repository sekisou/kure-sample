// グローバル変数
let rawShelters = [];
let filteredShelters = [];
let currentPage = 1;
let sheltersPerPage = 5;
let uniqueAreas = [];
let map = null;
let markers = [];

// DOMの読み込みを待つ
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing shelter app");
  initializeMap();
  initializeApp();
});

// 地図の初期化
function initializeMap() {
  try {
    console.log("Initializing Leaflet map");
    const mapElement = document.getElementById('map');
    
    if (!mapElement) {
      console.error("Map element not found");
      return;
    }

    // Leafletで地図を作成
    map = L.map('map').setView([34.24, 132.57], 13);

    // OpenStreetMap層を追加
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    console.log("Map initialized successfully");

  } catch (error) {
    console.error("Error initializing map:", error);
  }
}

// アプリケーション初期化
function initializeApp() {
  const csvFileInput = document.getElementById("csvFile");
  const searchInput = document.getElementById("searchInput");
  const areaFilter = document.getElementById("areaFilter");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const itemsPerPageSelect = document.getElementById("itemsPerPage");

  if (!csvFileInput) {
    console.error("csvFile element not found");
    return;
  }

  console.log("Setting up event listeners");

  // CSVファイルの読み込み
  csvFileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, "Size:", file.size);
    
    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      console.log("File loaded, length:", text.length);
      console.log("First 200 chars:", text.substring(0, 200));
      parseCSV(text);
    };
    reader.onerror = function (e) {
      console.error("FileReader error:", e);
      showError("ファイルの読み込みに失敗しました");
    };
    reader.readAsText(file, "UTF-8");

    document.getElementById("uploadStatus").innerHTML =
      '<span style="color: #48bb78;">読み込み中...</span>';
  });

  // 検索機能
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase();
      const areaFilterVal = areaFilter ? areaFilter.value : "";

      filteredShelters = rawShelters.filter((shelter) => {
        const matchesSearch = 
          shelter.name.toLowerCase().includes(searchTerm) ||
          shelter.address.toLowerCase().includes(searchTerm) ||
          shelter.phone.toLowerCase().includes(searchTerm);

        const matchesArea = areaFilterVal === "" || shelter.area === areaFilterVal;

        return matchesSearch && matchesArea;
      });

      currentPage = 1;
      updateShelterList();
    });
  }

  // エリアフィルター
  if (areaFilter) {
    areaFilter.addEventListener("change", function (e) {
      const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
      const areaFilterVal = e.target.value;

      filteredShelters = rawShelters.filter((shelter) => {
        const matchesSearch =
          shelter.name.toLowerCase().includes(searchTerm) ||
          shelter.address.toLowerCase().includes(searchTerm) ||
          shelter.phone.toLowerCase().includes(searchTerm);

        const matchesArea = areaFilterVal === "" || shelter.area === areaFilterVal;

        return matchesSearch && matchesArea;
      });

      currentPage = 1;
      updateShelterList();
    });
  }

  // ページネーションボタン
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        updateShelterList();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", function () {
      const totalPages = Math.ceil(filteredShelters.length / sheltersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        updateShelterList();
      }
    });
  }
}

// CSVパース関数
function parseCSV(text) {
  try {
    console.log("CSV parsing started");
    const lines = text.split("\n").filter((line) => line.trim());
    console.log(`Total lines: ${lines.length}`);
    
    if (lines.length < 2) {
      showError("データが不足しています");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    console.log("Headers:", headers);
    rawShelters = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(",");
      console.log(`Line ${i}:`, values);
      
      // 最低限のバリデーション：最初の3つのフィールドが必要
      if (values.length >= 3 && values[0].trim() && values[1].trim() && values[2].trim()) {
        const shelter = {
          name: values[0].trim() || "-",
          address: values[1].trim() || "-",
          area: values[2].trim() || "その他",
          phone: values[3] ? values[3].trim() : "-",
          capacity: values[4] ? parseInt(values[4].trim()) : "-",
          notes: values[5] ? values[5].trim() : "-",
          latitude: values[6] ? parseFloat(values[6].trim()) : null,
          longitude: values[7] ? parseFloat(values[7].trim()) : null,
        };
        rawShelters.push(shelter);
        console.log("Shelter added:", shelter);
      }
    }

    console.log(`Total shelters parsed: ${rawShelters.length}`);
    
    if (rawShelters.length > 0) {
      filteredShelters = [...rawShelters];
      extractUniqueAreas();
      document.getElementById(
        "uploadStatus"
      ).innerHTML = `<span style="color: #48bb78;">✓ ${rawShelters.length}件の避難所データを読み込みました</span>`;
      updateDashboard();
      addMarkersToMap();
    } else {
      showError("有効なデータが見つかりません。避難所名、住所、エリアが正しく入力されているか確認してください。");
    }
  } catch (error) {
    console.error("CSV parsing error:", error);
    showError("CSVの読み込みに失敗しました: " + error.message);
  }
}

// ユニークなエリアを抽出
function extractUniqueAreas() {
  try {
    uniqueAreas = [...new Set(rawShelters.map((s) => s.area))].sort();
    console.log("Unique areas:", uniqueAreas);
    populateAreaFilter();
  } catch (error) {
    console.error("Error extracting areas:", error);
  }
}

// エリアフィルターに値を設定
function populateAreaFilter() {
  try {
    const select = document.getElementById("areaFilter");
    // 既存のオプションをクリア（最初のデフォルトオプション以外）
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    uniqueAreas.forEach((area) => {
      const option = document.createElement("option");
      option.value = area;
      option.textContent = area;
      select.appendChild(option);
    });
    console.log("Area filter populated");
  } catch (error) {
    console.error("Error populating area filter:", error);
  }
}

// ダッシュボード更新
function updateDashboard() {
  document.getElementById("filterSection").classList.remove("hidden");
  document.getElementById("shelterSection").classList.remove("hidden");
  document.getElementById("errorMessage").classList.add("hidden");
  updateShelterList();
}

// 避難所リスト更新
function updateShelterList() {
  const start = (currentPage - 1) * sheltersPerPage;
  const end = start + sheltersPerPage;
  const pageData = filteredShelters.slice(start, end);

  const shelterList = document.getElementById("shelterList");
  shelterList.innerHTML = "";

  pageData.forEach((shelter) => {
    const card = createShelterCard(shelter);
    shelterList.appendChild(card);
  });

  updatePagination();
  updateResultCount();
}

// 避難所カードを作成
function createShelterCard(shelter) {
  const card = document.createElement("div");
  card.className = "shelter-card";

  const capacityHtml = typeof shelter.capacity === 'number' 
    ? `<p class="shelter-value capacity">収容可能人数: <strong>${shelter.capacity}人</strong></p>`
    : "";

  card.innerHTML = `
    <div class="shelter-header">
      <div class="shelter-name">${escapeHtml(shelter.name)}</div>
      <div class="shelter-area">${escapeHtml(shelter.area)}</div>
    </div>
    <div class="shelter-body">
      <div class="shelter-info">
        <div class="shelter-label">住所</div>
        <div class="shelter-value">${escapeHtml(shelter.address)}</div>
      </div>
      <div class="shelter-info">
        <div class="shelter-label">電話番号</div>
        <div class="shelter-value phone">${escapeHtml(shelter.phone)}</div>
      </div>
      ${capacityHtml}
      <div class="shelter-info">
        <div class="shelter-label">備考</div>
        <div class="shelter-value">${escapeHtml(shelter.notes)}</div>
      </div>
    </div>
  `;

  // カードをクリックして地図の中心を移動
  card.addEventListener('click', function() {
    if (map && shelter.latitude && shelter.longitude) {
      console.log(`Centering map on ${shelter.name}:`, shelter.latitude, shelter.longitude);
      map.setView([shelter.latitude, shelter.longitude], 15);
    }
  });

  return card;
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ページネーション更新
function updatePagination() {
  const totalPages = Math.ceil(filteredShelters.length / sheltersPerPage);
  document.getElementById(
    "pageInfo"
  ).textContent = `${currentPage} / ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// 結果件数更新
function updateResultCount() {
  document.getElementById("resultCount").textContent = filteredShelters.length;
}

// エラーメッセージ表示
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
  document.getElementById("uploadStatus").innerHTML =
    '<span style="color: #f56565;">エラーが発生しました</span>';
}

// 地図にマーカーを追加
function addMarkersToMap() {
  try {
    if (!map) {
      console.warn("Map not initialized yet");
      setTimeout(addMarkersToMap, 500);
      return;
    }

    console.log("Adding markers to map");
    
    // 既存のマーカーをクリア
    markers.forEach(marker => {
      map.removeLayer(marker);
    });
    markers = [];

    // 新しいマーカーを追加
    rawShelters.forEach(shelter => {
      if (shelter.latitude && shelter.longitude) {
        try {
          const marker = L.marker([shelter.latitude, shelter.longitude])
            .bindPopup(`
              <div style="font-size: 12px; width: 200px;">
                <strong>${escapeHtml(shelter.name)}</strong><br>
                <div style="margin-top: 5px;">
                  <div><strong>${escapeHtml(shelter.area)}</strong></div>
                  <div>${escapeHtml(shelter.address)}</div>
                  <div>📞 ${escapeHtml(shelter.phone)}</div>
                </div>
              </div>
            `)
            .addTo(map);
          
          markers.push(marker);
          console.log(`Marker added for ${shelter.name}`);
        } catch (markerError) {
          console.error(`Failed to add marker for ${shelter.name}:`, markerError);
        }
      }
    });

    console.log(`Total markers added: ${markers.length}`);

    // 地図をリセット（全マーカーを表示）
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  } catch (error) {
    console.error("Error adding markers to map:", error);
  }
}
