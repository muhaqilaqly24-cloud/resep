const API_URL = "https://www.themealdb.com/api/json/v1/1/";

const latestGrid = document.getElementById("latestGrid");
const popularGrid = document.getElementById("popularGrid");
const categoryGrid = document.getElementById("categoryGrid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultLabel = document.getElementById("result-label");
const recipeModal = document.getElementById("recipeModal");
const recipeModalContent = recipeModal.querySelector(".modal-body");
const loadMoreLatestBtn = document.getElementById("loadMoreLatest");
const refreshLatestBtn = document.getElementById("refreshLatest");
const contactForm = document.getElementById("contactForm");
const formFeedback = document.getElementById("formFeedback");

let currentMeals = [];
let latestOffset = 0;
const recipesPerPage = 6;

async function fetchJSON(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error("Gagal menghubungkan ke API.");
  }
  return await response.json();
}

function showLoading(element, message = "Memuat data...") {
  element.innerHTML = `
    <div class="loading-message">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>${message}</p>
    </div>
  `;
}

function showEmpty(element, message = "Resep tidak ditemukan.") {
  element.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-search"></i>
      <h4>Tidak Ditemukan</h4>
      <p>${message}</p>
    </div>
  `;
}

function showToast(message) {
  const toastBody = document.getElementById("toastBody");
  toastBody.textContent = message;
  const toast = bootstrap.Toast.getOrCreateInstance(document.getElementById("liveToast"));
  toast.show();
}

/* ==========================================
   RECIPE CARD
   ========================================== */

function createRecipeCard(meal, category = "Recipe") {
  return `
    <div class="col-md-6 col-lg-4">
      <article class="recipe-card">
        <div class="recipe-image-wrapper">
          <span class="recipe-category">${escapeHTML(category)}</span>
          <img src="${escapeHTML(meal.strMealThumb)}" alt="${escapeHTML(meal.strMeal)}" loading="lazy">
        </div>
        <div class="recipe-card-body">
          <h4>${escapeHTML(meal.strMeal)}</h4>
          <p>${escapeHTML(meal.strArea || "International")} - Menu spesial pilihan terbaik.</p>
          <div class="recipe-card-footer">
            <span><i class="bi bi-clock-fill"></i> 20 Min</span>
            <button type="button" data-bs-toggle="modal" data-bs-target="#recipeModal" data-id="${meal.idMeal}">
              Lihat Resep <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      </article>
    </div>
  `;
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

async function loadLatestRecipes(reset = true) {
  if (reset) {
    latestOffset = 0;
    searchInput.value = "";
    currentMeals = [];
  }

  showLoading(latestGrid, "Sedang mencari inspirasi resep...");
  
  try {
    const requests = [];
    for (let i = 0; i < recipesPerPage; i++) {
      requests.push(fetchJSON("random.php"));
    }

    const responses = await Promise.all(requests);
    const meals = responses.map(res => res.meals[0]).filter(Boolean);
    
    const uniqueMeals = Array.from(
      new Map(meals.map(meal => [meal.idMeal, meal])).values()
    );

    currentMeals = reset ? uniqueMeals : [...currentMeals, ...uniqueMeals];
    latestOffset = currentMeals.length;

    if (currentMeals.length === 0) {
      showEmpty(latestGrid);
      return;
    }

    latestGrid.innerHTML = currentMeals
      .map(meal => createRecipeCard(meal, "Terbaru"))
      .join("");

  } catch (error) {
    console.error(error);
    showEmpty(latestGrid, "Tidak dapat memuat resep. Periksa koneksi internetmu.");
  }
}

async function loadMoreLatestRecipes() {
  const loadButton = document.getElementById("loadMoreLatest");
  loadButton.disabled = true;
  loadButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Memuat...`;

  try {
    const requests = [];
    for (let i = 0; i < recipesPerPage; i++) {
      requests.push(fetchJSON("random.php"));
    }

    const responses = await Promise.all(requests);
    const newMeals = responses.map(res => res.meals[0]).filter(Boolean);

    const existingIds = new Set(currentMeals.map(m => m.idMeal));
    const filteredMeals = newMeals.filter(meal => !existingIds.has(meal.idMeal));

    if (filteredMeals.length === 0) {
      showToast("Tidak ada resep tambahan. Coba lagi nanti.");
    } else {
      currentMeals = [...currentMeals, ...filteredMeals];
      latestOffset = currentMeals.length;
      latestGrid.innerHTML = currentMeals
        .map(meal => createRecipeCard(meal, "Terbaru"))
        .join("");
    }
  } catch (error) {
    console.error(error);
    showToast("Gagal memuat resep tambahan.");
  } finally {
    loadButton.disabled = false;
    loadButton.innerHTML = `Muat Resep Lainnya <i class="bi bi-arrow-right"></i>`;
  }
}

async function searchRecipes(keyword) {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return;

  currentMeals = [];
  showLoading(latestGrid, `Mencari resep yang sesuai...`);

  try {
    const data = await fetchJSON(`search.php?s=${encodeURIComponent(cleanKeyword)}`);
    const meals = data.meals || [];

    if (meals.length === 0) {
      showEmpty(latestGrid, `Tidak ditemukan resep dengan kata "${cleanKeyword}".`);
      return;
    }

    currentMeals = meals;
    latestGrid.innerHTML = currentMeals
      .map(meal => createRecipeCard(meal, "Pencarian"))
      .join("");
  } catch (error) {
    console.error(error);
    showEmpty(latestGrid, "Pencarian gagal. Silahkan coba kembali.");
  }
}

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  searchRecipes(searchInput.value);
});

async function loadPopularRecipes() {
  showLoading(popularGrid, "Memuat resep populer...");

  try {
    const keywords = ["chicken", "pasta", "beef"];
    const requests = keywords.map(kw => fetchJSON(`search.php?s=${kw}`));

    const responses = await Promise.all(requests);
    const meals = responses.flatMap(res => res.meals || []);

    const uniqueMeals = Array.from(
      new Map(meals.map(meal => [meal.idMeal, meal])).values()
    );

    const selectedMeals = uniqueMeals.slice(0, 3);

    if (selectedMeals.length === 0) {
      showEmpty(popularGrid);
      return;
    }

    popularGrid.innerHTML = selectedMeals
      .map(meal => createRecipeCard(meal, "Populer"))
      .join("");
  } catch (error) {
    console.error(error);
    showEmpty(popularGrid, "Gagal memuat resep populer.");
  }
}

/* ==========================================
   CATEGORY FILTER
   ========================================== */

async function loadCategory(category) {
  showLoading(categoryGrid, "Memuat kategori makanan...");

  try {
    let data;
    if (category === "all") {
      data = await fetchJSON("search.php?s=");
    } else {
      data = await fetchJSON(`filter.php?c=${encodeURIComponent(category)}`);
    }

    const meals = data.meals || [];

    if (meals.length === 0) {
      showEmpty(categoryGrid, "Belum ada makanan di kategori ini.");
      return;
    }

    categoryGrid.innerHTML = meals
      .slice(0, 6)
      .map(meal => createRecipeCard(meal, category === "all" ? "Recipe" : category))
      .join("");

  } catch (error) {
    console.error(error);
    showEmpty(categoryGrid, "Gagal memuat kategori.");
  }
}

document.querySelectorAll(".category-chip").forEach(button => {
  button.addEventListener("click", function () {
    document.querySelectorAll(".category-chip").forEach(btn => btn.classList.remove("active"));
    this.classList.add("active");
    loadCategory(this.dataset.category);
  });
});

/* ==========================================
   RECIPE DETAIL MODAL
   ========================================== */

async function showRecipeDetail(id) {
  recipeModalContent.innerHTML = `
    <div class="loading-message">
      <div class="spinner-border" role="status"></div>
      <p>Memuat detail resep...</p>
    </div>
  `;

  try {
    const data = await fetchJSON(`lookup.php?i=${encodeURIComponent(id)}`);
    const meal = data.meals?.[0];

    if (!meal) {
      recipeModalContent.innerHTML = `
        <div class="empty-state">
          <h4>Gagal memuat</h4>
          <p>Silahkan coba kembali.</p>
        </div>
      `;
      return;
    }

    renderRecipeDetail(meal);
  } catch (error) {
    console.error(error);
    recipeModalContent.innerHTML = `
      <div class="empty-state">
        <h4>Gagal memuat resep</h4>
        <p>Silahkan coba kembali.</p>
      </div>
    `;
  }
}

function renderRecipeDetail(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`<li>${escapeHTML(measure)} ${escapeHTML(ingredient)}</li>`);
    }
  }

  const instructions = meal.strInstructions || "Instruksi belum tersedia.";

  recipeModalContent.innerHTML = `
    <div class="recipe-detail">
      <img src="${escapeHTML(meal.strMealThumb)}" alt="${escapeHTML(meal.strMeal)}" class="recipe-detail-image mb-4">
      <h3 class="recipe-detail-title">${escapeHTML(meal.strMeal)}</h3>
      <div class="recipe-detail-info mb-3">
        <span class="badge bg-secondary-subtle text-dark">Kategori: ${escapeHTML(meal.strCategory)}</span>
        <span class="badge bg-success-subtle text-success">Area: ${escapeHTML(meal.strArea || "International")}</span>
      </div>
      <div class="row g-4">
        <div class="col-md-6">
          <h5 class="subheading">Bahan-Bahan</h5>
          <ul>
            ${ingredients.length ? ingredients.join("") : "<li>Bahan belum tersedia.</li>"}
          </ul>
        </div>
        <div class="col-md-6">
          <h5 class="subheading">Instruksi Memasak</h5>
          <p>${escapeHTML(instructions).replace(/\r\n/g, "<br>")}</p>
        </div>
      </div>
      ${meal.strYoutube ? `
        <div class="mt-4 text-center">
          <a href="${safeExternalURL(meal.strYoutube)}" target="_blank" class="btn btn-dark-custom">
            <i class="bi bi-youtube"></i> Lihat Video Memasak
          </a>
        </div>
      ` : ""}
    </div>
  `;
}

function safeExternalURL(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return "#";
  }
  return "#";
}

/* ==========================================
   EVENT DELEGATION
   ========================================== */

document.addEventListener("click", function (event) {
  const detailButton = event.target.closest("[data-bs-target='#recipeModal']");
  if (detailButton) {
    const id = detailButton.dataset.id;
    if (id) {
      showRecipeDetail(id);
    }
  }
});

/* ==========================================
   REFRESH & LOAD MORE BUTTONS
   ========================================== */

refreshLatestBtn.addEventListener("click", () => {
  loadLatestRecipes(true);
});

loadMoreLatestBtn.addEventListener("click", () => {
  loadMoreLatestRecipes();
});

/* ==========================================
   LIGHTBOX
   ========================================== */

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.querySelector(".lightbox-close");

document.querySelectorAll(".gallery-item").forEach(item => {
  item.addEventListener("click", () => {
    const imgSrc = item.querySelector("img").src;
    lightboxImage.src = imgSrc;
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});

function closeLightbox() {
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("active")) {
    closeLightbox();
  }
});

/* ==========================================
   CONTACT FORM SUBMISSION
   ========================================== */

contactForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = document.getElementById("contactName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const subject = document.getElementById("contactSubject").value.trim();
  const message = document.getElementById("contactMessage").value.trim();

  if (!name || !email || !subject || !message) {
    formFeedback.innerHTML = `<span class="text-danger">Semua kolom harus diisi.</span>`;
    return;
  }

  formFeedback.innerHTML = `<span class="text-success">Terima kasih! Formulir berhasil dikirim. (Fitur pengiriman pesan belum terhubung ke server.)</span>`;
  contactForm.reset();
  showToast("Terima kasih sudah menghubungi Resep Haly.");
});

/* ==========================================
   NAVBAR & SCROLLSPY LOGIC
   ========================================== */

const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
  loadLatestRecipes(true);
  loadPopularRecipes();
  loadCategory("all");

  // Reveal Animations on Scroll
  const revealElements = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => observer.observe(el));
});
