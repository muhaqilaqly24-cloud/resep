/* =========================================
   RESEP NALY - JAVASCRIPT
   API: TheMealDB
========================================= */

const API_URL = "https://www.themealdb.com/api/json/v1/1/";

/* =========================================
   ELEMENTS
========================================= */

const latestGrid = document.getElementById("latestGrid");
const popularGrid = document.getElementById("popularGrid");
const categoryGrid = document.getElementById("categoryGrid");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultLabel = document.getElementById("resultLabel");

const recipeModalElement = document.getElementById("recipeModal");
const recipeDetail = document.getElementById("recipeDetail");

const toastElement = document.getElementById("siteToast");
const toastMessage = document.getElementById("toastMessage");

const contactForm = document.getElementById("contactForm");
const formFeedback = document.getElementById("formFeedback");

let currentMeals = [];
let currentSearch = "";
let latestOffset = 0;

const recipesPerPage = 6;

/* =========================================
   API HELPER
========================================= */

async function fetchAPI(endpoint) {
    try {
        const response = await fetch(API_URL + endpoint);

        if (!response.ok) {
            throw new Error("Gagal menghubungkan ke API.");
        }

        return await response.json();

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

/* =========================================
   LOADING
========================================= */

function showLoading(element, message = "Memuat data...") {
    element.innerHTML = `
        <div class="col-12">
            <div class="loading-message">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>${message}</p>
            </div>
        </div>
    `;
}

function showEmpty(element, message = "Resep tidak ditemukan.") {
    element.innerHTML = `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-emoji-frown"></i>
                <h4>Belum Ada Resep</h4>
                <p>${message}</p>
            </div>
        </div>
    `;
}

/* =========================================
   TOAST
========================================= */

function showToast(message) {
    if (!toastElement || !toastMessage || !window.bootstrap) {
        return;
    }

    toastMessage.textContent = message;

    const toast = bootstrap.Toast.getOrCreateInstance(toastElement, {
        delay: 3000
    });

    toast.show();
}

/* =========================================
   RECIPE CARD
========================================= */

function createRecipeCard(meal) {
    const category = meal.strCategory || "Recipe";
    const area = meal.strArea || "International";

    return `
        <div class="col-md-6 col-lg-4">
            <article class="recipe-card">

                <div class="recipe-image-wrapper">
                    <img
                        src="${meal.strMealThumb}"
                        class="recipe-image"
                        alt="${escapeHTML(meal.strMeal)}"
                        loading="lazy">

                    <span class="recipe-category">
                        ${escapeHTML(category)}
                    </span>
                </div>

                <div class="recipe-card-body">

                    <h4>${escapeHTML(meal.strMeal)}</h4>

                    <p>
                        <i class="bi bi-globe2 me-1"></i>
                        ${escapeHTML(area)}
                    </p>

                    <div class="recipe-card-footer">
                        <span>
                            <i class="bi bi-bookmark-heart me-1"></i>
                            Inspirasi Masakan
                        </span>

                        <button
                            type="button"
                            class="detail-button"
                            data-meal-id="${meal.idMeal}">
                            Lihat Resep
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>

                </div>
            </article>
        </div>
    `;
}

/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

/* =========================================
   LOAD RANDOM RECIPES
========================================= */

async function loadLatestRecipes(reset = true) {
    if (reset) {
        latestOffset = 0;
        currentMeals = [];
        currentSearch = "";
        searchInput.value = "";
    }

    showLoading(latestGrid, "Sedang mencari inspirasi resep...");

    if (resultLabel) {
        resultLabel.textContent = "Pilihan Resep";
    }

    try {
        const requests = [];

        for (let i = 0; i < recipesPerPage; i++) {
            requests.push(fetchAPI("random.php"));
        }

        const responses = await Promise.all(requests);

        const meals = responses
            .map(response => response.meals?.[0])
            .filter(Boolean);

        const uniqueMeals = [
            ...new Map(meals.map(meal => [meal.idMeal, meal])).values()
        ];

        currentMeals = uniqueMeals;
        latestOffset = uniqueMeals.length;

        if (uniqueMeals.length === 0) {
            showEmpty(latestGrid, "Coba muat ulang beberapa saat lagi.");
            return;
        }

        renderLatestRecipes();

    } catch (error) {
        showEmpty(
            latestGrid,
            "Tidak dapat memuat resep. Periksa koneksi internetmu."
        );
    }
}

function renderLatestRecipes() {
    latestGrid.innerHTML = currentMeals
        .map(meal => createRecipeCard(meal))
        .join("");
}

/* =========================================
   LOAD MORE RECIPES
========================================= */

async function loadMoreRecipes() {
    const loadButton = document.getElementById("loadMoreLatest");

    if (loadButton) {
        loadButton.disabled = true;
        loadButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Memuat...
        `;
    }

    try {
        const requests = [];

        for (let i = 0; i < 3; i++) {
            requests.push(fetchAPI("random.php"));
        }

        const responses = await Promise.all(requests);

        const newMeals = responses
            .map(response => response.meals?.[0])
            .filter(Boolean);

        const existingIds = new Set(
            currentMeals.map(meal => meal.idMeal)
        );

        const filteredMeals = newMeals.filter(
            meal => !existingIds.has(meal.idMeal)
        );

        if (filteredMeals.length > 0) {
            currentMeals = [...currentMeals, ...filteredMeals];
            latestOffset = currentMeals.length;
            renderLatestRecipes();
        } else {
            showToast("Belum ada resep tambahan. Coba lagi.");
        }

    } catch (error) {
        showToast("Gagal memuat resep tambahan.");
    } finally {
        if (loadButton) {
            loadButton.disabled = false;
            loadButton.innerHTML = `
                Muat Resep Lainnya
                <i class="bi bi-plus-lg"></i>
            `;
        }
    }
}

/* =========================================
   SEARCH RECIPES
========================================= */

async function searchRecipes(keyword) {
    const searchTerm = keyword.trim();

    if (!searchTerm) {
        showToast("Masukkan nama makanan terlebih dahulu.");
        return;
    }

    currentSearch = searchTerm;

    showLoading(latestGrid, "Mencari resep yang sesuai...");

    if (resultLabel) {
        resultLabel.textContent = `Hasil pencarian: ${searchTerm}`;
    }

    try {
        const data = await fetchAPI(
            `search.php?s=${encodeURIComponent(searchTerm)}`
        );

        const meals = data.meals || [];

        if (meals.length === 0) {
            showEmpty(
                latestGrid,
                `Tidak ditemukan resep dengan kata "${searchTerm}".`
            );

            currentMeals = [];
            return;
        }

        currentMeals = meals;
        renderLatestRecipes();

    } catch (error) {
        showEmpty(
            latestGrid,
            "Pencarian gagal. Silakan coba kembali."
        );
    }
}

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    searchRecipes(searchInput.value);
});

/* =========================================
   POPULAR RECIPES
========================================= */

async function loadPopularRecipes() {
    showLoading(popularGrid, "Memuat resep populer...");

    const popularKeywords = [
        "chicken",
        "pasta",
        "beef"
    ];

    try {
        const responses = await Promise.all(
            popularKeywords.map(keyword =>
                fetchAPI(`search.php?s=${keyword}`)
            )
        );

        const meals = responses
            .flatMap(response => response.meals || []);

        const uniqueMeals = [
            ...new Map(
                meals.map(meal => [meal.idMeal, meal])
            ).values()
        ];

        const selectedMeals = uniqueMeals.slice(0, 6);

        if (selectedMeals.length === 0) {
            showEmpty(popularGrid, "Belum ada resep populer.");
            return;
        }

        popularGrid.innerHTML = selectedMeals
            .map(meal => createRecipeCard(meal))
            .join("");

    } catch (error) {
        showEmpty(popularGrid, "Gagal memuat resep populer.");
    }
}

/* =========================================
   CATEGORY FILTER
========================================= */

async function loadCategory(category) {
    document.querySelectorAll(".category-chip").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.category === category
        );
    });

    showLoading(categoryGrid, "Memuat kategori makanan...");

    try {
        let data;

        if (category === "all") {
            data = await fetchAPI("search.php?s=");
        } else {
            data = await fetchAPI(
                `filter.php?c=${encodeURIComponent(category)}`
            );
        }

        let meals = data.meals || [];

        if (meals.length === 0) {
            showEmpty(categoryGrid, "Belum ada makanan di kategori ini.");
            return;
        }

        meals = meals.slice(0, 6);

        categoryGrid.innerHTML = meals.map(meal => {
            return createRecipeCard({
                ...meal,
                strCategory: category === "all" ? "Recipe" : category,
                strArea: "Explore Recipe"
            });
        }).join("");

    } catch (error) {
        showEmpty(categoryGrid, "Gagal memuat kategori.");
    }
}

document.querySelectorAll(".category-chip").forEach(button => {
    button.addEventListener("click", function () {
        loadCategory(this.dataset.category);
    });
});

/* =========================================
   RECIPE DETAIL
========================================= */

async function showRecipeDetail(mealId) {
    if (!mealId) return;

    recipeDetail.innerHTML = `
        <div class="loading-message">
            <div class="spinner-border"></div>
            <p>Memuat detail resep...</p>
        </div>
    `;

    const modal = bootstrap.Modal.getOrCreateInstance(recipeModalElement);
    modal.show();

    try {
        const data = await fetchAPI(
            `lookup.php?i=${encodeURIComponent(mealId)}`
        );

        const meal = data.meals?.[0];

        if (!meal) {
            recipeDetail.innerHTML = `
                <div class="empty-state">
                    <h4>Resep tidak ditemukan</h4>
                </div>
            `;
            return;
        }

        renderRecipeDetail(meal);

    } catch (error) {
        recipeDetail.innerHTML = `
            <div class="empty-state">
                <h4>Gagal memuat resep</h4>
                <p>Silakan coba kembali.</p>
            </div>
        `;
    }
}

function renderRecipeDetail(meal) {
    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]?.trim();
        const measure = meal[`strMeasure${i}`]?.trim();

        if (ingredient) {
            ingredients.push(`
                <li>
                    ${escapeHTML(ingredient)}
                    ${measure ? ` — ${escapeHTML(measure)}` : ""}
                </li>
            `);
        }
    }

    const instructions = meal.strInstructions || "Instruksi belum tersedia.";

    recipeDetail.innerHTML = `
        <div class="recipe-detail">

            <img
                src="${meal.strMealThumb}"
                class="recipe-detail-image"
                alt="${escapeHTML(meal.strMeal)}">

            <h3 class="recipe-detail-title">
                ${escapeHTML(meal.strMeal)}
            </h3>

            <p>
                <span class="badge text-bg-secondary me-2">
                    ${escapeHTML(meal.strCategory || "Food")}
                </span>

                <span class="badge text-bg-success">
                    ${escapeHTML(meal.strArea || "International")}
                </span>
            </p>

            <h5>
                <i class="bi bi-basket2 me-2"></i>
                Bahan-Bahan
            </h5>

            <ul>
                ${ingredients.length
                    ? ingredients.join("")
                    : "<li>Bahan belum tersedia.</li>"}
            </ul>

            <h5>
                <i class="bi bi-journal-text me-2"></i>
                Cara Memasak
            </h5>

            <p>${escapeHTML(instructions).replace(/\r?\n/g, "<br>")}</p>

            ${meal.strYoutube ? `
                <a href="${safeExternalURL(meal.strYoutube)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="btn btn-dark-custom mt-3">
                    <i class="bi bi-youtube"></i>
                    Lihat Video Memasak
                </a>
            ` : ""}

        </div>
    `;
}

function safeExternalURL(url) {
    try {
        const parsed = new URL(url);

        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
            return parsed.href;
        }
    } catch (error) {
        return "#";
    }

    return "#";
}

/* =========================================
   EVENT DELEGATION
========================================= */

document.addEventListener("click", function (event) {
    const detailButton = event.target.closest(".detail-button");

    if (detailButton) {
        const mealId = detailButton.dataset.mealId;
        showRecipeDetail(mealId);
    }
});

/* =========================================
   REFRESH BUTTON
========================================= */

document.getElementById("refreshLatest").addEventListener("click", () => {
    loadLatestRecipes(true);
});

/* =========================================
   LOAD MORE BUTTON
========================================= */

document.getElementById("loadMoreLatest").addEventListener("click", () => {
    loadMoreRecipes();
});

/* =========================================
   GALLERY LIGHTBOX
========================================= */

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".gallery-item").forEach(item => {
    item.addEventListener("click", function (event) {
        event.preventDefault();

        const imageURL = this.getAttribute("href");

        lightboxImage.src = imageURL;
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

lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) {
        closeLightbox();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeLightbox();
    }
});

/* =========================================
   CONTACT FORM
========================================= */

contactForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const subject = document.getElementById("contactSubject").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    if (!name || !email || !subject || !message) {
        formFeedback.textContent = "Semua kolom harus diisi.";
        formFeedback.className = "text-danger mt-2";
        return;
    }

    formFeedback.textContent =
        "Terima kasih! Formulir berhasil diperiksa. Fitur pengiriman pesan belum terhubung ke server.";

    formFeedback.className = "text-success mt-2";

    contactForm.reset();

    showToast("Terima kasih sudah menghubungi Resep Naly.");
});

/* =========================================
   NAVBAR SCROLL EFFECT
========================================= */

const navbar = document.getElementById("mainNav");

function updateNavbar() {
    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
}

window.addEventListener("scroll", updateNavbar, {
    passive: true
});

updateNavbar();

/* =========================================
   CLOSE MOBILE NAVBAR
========================================= */

const navbarContent = document.getElementById("navbarContent");

document.querySelectorAll("#navbarContent .nav-link, #navbarContent .btn-nav")
    .forEach(link => {

        link.addEventListener("click", () => {
            if (
                window.innerWidth < 992 &&
                navbarContent.classList.contains("show")
            ) {
                bootstrap.Collapse.getOrCreateInstance(
                    navbarContent
                ).hide();
            }
        });

    });


/* =========================================
   SCROLLSPY - RESEP NALY
   STABLE SCROLL DETECTION
========================================= */

const scrollSpyNavbar = document.getElementById("mainNav");

const scrollSpyLinks = Array.from(
    document.querySelectorAll(
        '#mainNav .nav-link[href^="#"]'
    )
);

let scrollSpyTicking = false;

function refreshScrollSpy() {

    if (!scrollSpyNavbar || scrollSpyLinks.length === 0) {
        return;
    }

    const navbarHeight = scrollSpyNavbar.offsetHeight;

    // Posisi deteksi disesuaikan dengan tinggi navbar.
    const scrollPosition =
        window.scrollY + navbarHeight + 80;

    let activeLink = scrollSpyLinks[0];

    scrollSpyLinks.forEach(link => {

        const targetId = link.getAttribute("href");

        const targetSection = document.querySelector(targetId);

        if (!targetSection) return;

        const sectionTop =
            targetSection.getBoundingClientRect().top +
            window.scrollY;

        if (scrollPosition >= sectionTop) {
            activeLink = link;
        }

    });

    // Jika halaman sudah mencapai bagian paling bawah,
    // aktifkan menu Kontak.
    const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 5;

    if (reachedBottom) {
        activeLink = scrollSpyLinks[scrollSpyLinks.length - 1];
    }

    // Perbarui status menu navbar.
    scrollSpyLinks.forEach(link => {

        const isActive = link === activeLink;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }

    });
}

// Mengoptimalkan proses deteksi saat halaman di-scroll.
function scheduleScrollSpyRefresh() {

    if (scrollSpyTicking) return;

    scrollSpyTicking = true;

    requestAnimationFrame(() => {

        refreshScrollSpy();

        scrollSpyTicking = false;

    });

}

// Event scroll.
window.addEventListener(
    "scroll",
    scheduleScrollSpyRefresh,
    { passive: true }
);

// Event resize.
window.addEventListener(
    "resize",
    scheduleScrollSpyRefresh
);

// Event perpindahan hash.
window.addEventListener(
    "hashchange",
    scheduleScrollSpyRefresh
);

// Jalankan ketika halaman selesai dimuat.
window.addEventListener("load", refreshScrollSpy);

// Jalankan ketika DOM siap.
document.addEventListener(
    "DOMContentLoaded",
    refreshScrollSpy
);

// Jalankan kembali setelah gambar selesai dimuat.
document.querySelectorAll("img").forEach(image => {

    if (!image.complete) {

        image.addEventListener(
            "load",
            scheduleScrollSpyRefresh,
            { once: true }
        );

    }

});

// Deteksi awal.
refreshScrollSpy();

/* =========================================
   REVEAL ANIMATION
========================================= */

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                }
            });

        },
        {
            threshold: 0.12
        }
    );

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });

} else {
    revealElements.forEach(element => {
        element.classList.add("show");
    });
}

/* =========================================
   HERO PARALLAX - FIX
========================================= */

const heroSection = document.querySelector(".hero-section");
const heroBackground = document.querySelector(".hero-bg");

if (heroSection && heroBackground) {

    let parallaxTicking = false;

    function updateHeroParallax() {
        const rect = heroSection.getBoundingClientRect();

        // Gerakan background dibuat lebih lambat dari scroll halaman.
        const movement = rect.top * -0.30;

        // Membatasi gerakan agar background tidak memperlihatkan ruang kosong.
        const limitedMovement = Math.max(
            -140,
            Math.min(140, movement)
        );

        heroBackground.style.transform =
            `translate3d(0, ${limitedMovement}px, 0) scale(1.15)`;

        parallaxTicking = false;
    }

    function requestParallaxUpdate() {
        if (!parallaxTicking) {
            requestAnimationFrame(updateHeroParallax);
            parallaxTicking = true;
        }
    }

    window.addEventListener("scroll", requestParallaxUpdate, {
        passive: true
    });

    window.addEventListener("resize", requestParallaxUpdate);

    // Jalankan langsung saat halaman dibuka.
    updateHeroParallax();
}

/* =========================================
   FOOTER YEAR
========================================= */

document.getElementById("year").textContent =
    new Date().getFullYear();

/* =========================================
   INITIALIZE WEBSITE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadLatestRecipes(true);

    loadPopularRecipes();

    loadCategory("all");

    refreshScrollSpy();

    console.log("Resep Naly berhasil dijalankan.");

});
