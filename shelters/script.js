// グローバル変数
let rawShelters = [];
let filteredShelters = [];
let currentPage = 1;
let sheltersPerPage = 9;
let uniqueAreas = [];

// CSVファイルの読み込み
document.getElementById("csvFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file, "UTF-8");

  document.getElementById("uploadStatus").innerHTML =
    '<span style="color: #48bb78;">読み込み中...</span>';
});

// CSVパース関数
function parseCSV(text) {
  try {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      showError("データが不足しています");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    rawShelters = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length >= 4) {
        const shelter = {
          name: values[0] || "-",
          address: values[1] || "-",
          area: values[2] || "その他",
          phone: values[3] || "-",
          capacity: values[4] ? parseInt(values[4]) : "-",
          notes: values[5] || "-",
        };
        rawShelters.push(shelter);
      }
    }

    if (rawShelters.length > 0) {
      filteredShelters = [...rawShelters];
      extractUniqueAreas();
      document.getElementById(
        "uploadStatus"
      ).innerHTML = `<span style="color: #48bb78;">✓ ${rawShelters.length}件の避難所データを読み込みました</span>`;
      updateDashboard();
    } else {
      showError("有効なデータが見つかりません");
    }
  } catch (error) {
    showError("CSVの読み込みに失敗しました: " + error.message);
  }
}

// ユニークなエリアを抽出
function extractUniqueAreas() {
  uniqueAreas = [...new Set(rawShelters.map((s) => s.area))].sort();
  populateAreaFilter();
}

// エリアフィルターに値を設定
function populateAreaFilter() {
  const select = document.getElementById("areaFilter");
  uniqueAreas.forEach((area) => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    select.appendChild(option);
  });
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

// 検索機能
document.getElementById("searchInput").addEventListener("input", function (e) {
  const searchTerm = e.target.value.toLowerCase();
  const areaFilter = document.getElementById("areaFilter").value;

  filteredShelters = rawShelters.filter((shelter) => {
    const matchesSearch = 
      shelter.name.toLowerCase().includes(searchTerm) ||
      shelter.address.toLowerCase().includes(searchTerm) ||
      shelter.phone.toLowerCase().includes(searchTerm);

    const matchesArea = areaFilter === "" || shelter.area === areaFilter;

    return matchesSearch && matchesArea;
  });

  currentPage = 1;
  updateShelterList();
});

// エリアフィルター
document
  .getElementById("areaFilter")
  .addEventListener("change", function (e) {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const areaFilter = e.target.value;

    filteredShelters = rawShelters.filter((shelter) => {
      const matchesSearch =
        shelter.name.toLowerCase().includes(searchTerm) ||
        shelter.address.toLowerCase().includes(searchTerm) ||
        shelter.phone.toLowerCase().includes(searchTerm);

      const matchesArea = areaFilter === "" || shelter.area === areaFilter;

      return matchesSearch && matchesArea;
    });

    currentPage = 1;
    updateShelterList();
  });

// ページネーションボタン
document.getElementById("prevPage").addEventListener("click", function () {
  if (currentPage > 1) {
    currentPage--;
    updateShelterList();
  }
});

document.getElementById("nextPage").addEventListener("click", function () {
  const totalPages = Math.ceil(filteredShelters.length / sheltersPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateShelterList();
  }
});

// エラーメッセージ表示
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
  document.getElementById("uploadStatus").innerHTML =
    '<span style="color: #f56565;">エラーが発生しました</span>';
}
