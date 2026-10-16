const projectList = document.querySelector("#project-list");
const listStatus = document.querySelector("#project-list-status");
const projectCount = document.querySelector("#project-count");
const searchInput = document.querySelector("#project-search");
const emptyState = document.querySelector("#project-empty-state");

let projects = [];
let githubProjects = [];
let githubSearchRequest;
let searchTimer;
const searchCache = new Map();
const searchStorageKey = "d-code-template-search";

function restoreSavedSearch() {
    try {
        const saved = JSON.parse(localStorage.getItem(searchStorageKey) || "null");
        if (!saved || typeof saved.query !== "string") return;

        const query = saved.query.trim().toLocaleLowerCase();
        searchInput.value = saved.query;
        if (!query || !Array.isArray(saved.results) || saved.results.length === 0) return;

        const results = saved.results.map(normalizeProject).filter(isHtmlWebsiteProject);
        if (results.length === 0) return;
        searchCache.set(query, results);
        githubProjects = results;
    } catch {
        return;
    }
}

function saveSearch(query, results = []) {
    try {
        if (!query) {
            localStorage.removeItem(searchStorageKey);
            return;
        }
        localStorage.setItem(searchStorageKey, JSON.stringify({ query, results }));
    } catch {
        // Pencarian tetap berfungsi bila penyimpanan browser tidak tersedia.
    }
}

function parseRepositoryUrl(repositoryUrl) {
    let url;
    try {
        url = new URL(repositoryUrl);
    } catch {
        throw new Error(`URL repository tidak valid: ${repositoryUrl}`);
    }

    if (url.hostname !== "github.com") {
        throw new Error(`Repository harus berada di GitHub: ${repositoryUrl}`);
    }

    const [owner, repository] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repository) {
        throw new Error(`URL repository harus berisi pemilik dan nama repository: ${repositoryUrl}`);
    }

    return { owner, repository: repository.replace(/\.git$/i, "") };
}

function prettifyName(repository) {
    return repository
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function normalizeProject(raw) {
    if (typeof raw === "string") {
        const { owner, repository } = parseRepositoryUrl(raw);
        return {
            owner,
            repository,
            name: prettifyName(repository),
            author: owner,
            description: "",
            language: "code",
            url: raw
        };
    }

    if (!raw || typeof raw !== "object") {
        throw new Error(`Data proyek tidak valid: ${JSON.stringify(raw)}`);
    }

    let owner = raw.owner;
    let repository = raw.repository;

    if ((!owner || !repository) && raw.url) {
        const parsed = parseRepositoryUrl(raw.url);
        owner = owner || parsed.owner;
        repository = repository || parsed.repository;
    }

    if (!owner || !repository) {
        throw new Error(`Data proyek tidak lengkap: ${JSON.stringify(raw)}`);
    }

    return {
        owner,
        repository,
        name: raw.name || prettifyName(repository),
        author: raw.author || owner,
        description: raw.description || "",
        language: raw.language || "code",
        url: raw.url || `https://github.com/${owner}/${repository}`
    };
}

function isHtmlWebsiteProject(project) {
    return (project.language || "").toLocaleLowerCase() === "html";
}

function createProjectCard(project) {
    const link = document.createElement("a");
    link.className = "project-card";
    link.href = `/templates/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.repository)}`;

    const heading = document.createElement("span");
    heading.className = "project-card-heading";

    const name = document.createElement("span");
    name.className = "project-card-name";
    name.textContent = project.name;

    const arrow = document.createElement("i");
    arrow.className = "fas fa-arrow-up-right-from-square";
    arrow.setAttribute("aria-hidden", "true");
    heading.append(name, arrow);

    const author = document.createElement("span");
    author.className = "project-card-author";
    const authorIcon = document.createElement("i");
    authorIcon.className = "fas fa-user";
    authorIcon.setAttribute("aria-hidden", "true");
    author.append(authorIcon, document.createTextNode(project.author));

    const description = document.createElement("span");
    description.className = "project-card-description";
    description.textContent = project.description || "Buka untuk melihat source code dan pratinjau proyek.";

    const footer = document.createElement("span");
    footer.className = "project-card-footer";
    const language = document.createElement("span");
    language.textContent = (project.language || "code").toUpperCase();
    const repository = document.createElement("span");
    const githubIcon = document.createElement("i");
    githubIcon.className = "fab fa-github";
    githubIcon.setAttribute("aria-hidden", "true");
    repository.append(githubIcon, document.createTextNode(" GitHub"));
    footer.append(language, repository);

    link.append(heading, author, description, footer);
    link.dataset.search = [
        project.owner,
        project.name,
        project.author,
        project.description,
        project.language
    ].join(" ").toLocaleLowerCase();
    return link;
}

async function loadProjects() {
    try {
        const response = await fetch("/projects.json", {
            headers: { Accept: "application/json" }
        });
        if (!response.ok) {
            throw new Error(`Server mengembalikan status ${response.status}.`);
        }

        const data = await response.json();
        const rawList = Array.isArray(data) ? data : data.projects;
        if (!Array.isArray(rawList) || rawList.length === 0) {
            throw new Error("Belum ada proyek yang tersedia.");
        }

        projects = [];
        const errors = [];
        rawList.forEach((raw) => {
            try {
                projects.push(normalizeProject(raw));
            } catch (error) {
                errors.push(error);
            }
        });

        if (projects.length === 0) {
            throw new Error(errors.map((error) => error.message).join(" "));
        }

        projectCount.textContent = String(projects.length);
        projectList.replaceChildren(...projects.map(createProjectCard));
        listStatus.hidden = true;
        filterProjects();
        if (errors.length > 0) {
            listStatus.textContent = `${errors.length} proyek tidak dapat dimuat.`;
            listStatus.dataset.state = "warning";
            listStatus.hidden = false;
        }
    } catch (error) {
        listStatus.textContent = `Daftar proyek tidak dapat dimuat: ${error.message}`;
        listStatus.dataset.state = "error";
    }
}

function filterProjects() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    clearTimeout(searchTimer);
    githubSearchRequest?.abort();
    githubProjects = [];
    listStatus.hidden = true;

    if (!query) {
        saveSearch("");
        renderProjectMatches("");
        listStatus.hidden = true;
        return;
    }

    renderProjectMatches(query);
    const cachedResults = searchCache.get(query);
    if (cachedResults?.length) {
        githubProjects = cachedResults;
        saveSearch(query, cachedResults);
        renderProjectMatches(query);
        listStatus.hidden = true;
        return;
    }

    saveSearch(query);
    searchTimer = setTimeout(() => searchGitHub(query), 450);
}

function renderProjectMatches(query) {
    const localMatches = projects.filter((project) => [
        project.owner,
        project.name,
        project.author,
        project.description,
        project.language
    ].join(" ").toLocaleLowerCase().includes(query));
    const localKeys = new Set(localMatches.map((project) => `${project.owner}/${project.repository}`.toLowerCase()));
    const visibleProjects = [
        ...localMatches,
        ...githubProjects.filter((project) =>
            !localKeys.has(`${project.owner}/${project.repository}`.toLowerCase())
        )
    ];

    projectCount.textContent = String(visibleProjects.length);
    projectList.replaceChildren(...visibleProjects.map(createProjectCard));
    emptyState.hidden = visibleProjects.length > 0;
}

async function searchGitHub(query) {
    githubSearchRequest?.abort();
    githubSearchRequest = new AbortController();
    const { signal } = githubSearchRequest;
    listStatus.textContent = "Mencari Repository";
    listStatus.dataset.state = "";
    listStatus.hidden = false;

    try {
        const params = new URLSearchParams({
            q: `${query} in:name,description,readme language:HTML`,
            per_page: "12"
        });
        const response = await fetch(`https://api.github.com/search/repositories?${params}`, {
            signal,
            headers: { Accept: "application/vnd.github+json" }
        });
        if (!response.ok) {
            throw new Error(`GitHub mengembalikan status ${response.status}.`);
        }

        const data = await response.json();
        const results = (Array.isArray(data.items) ? data.items : [])
            .filter((repo) => repo.owner && repo.owner.login && repo.language === "HTML")
            .map((repo) => normalizeProject({
                owner: repo.owner.login,
                repository: repo.name,
                name: repo.name,
                author: repo.owner.login,
                description: repo.description || "",
                language: repo.language || "code",
                url: repo.html_url
            }));
        searchCache.set(query, results);
        if (searchInput.value.trim().toLocaleLowerCase() !== query) return;
        githubProjects = results;
        saveSearch(query, results);
        renderProjectMatches(query);
        listStatus.hidden = true;
    } catch (error) {
        if (error.name === "AbortError") return;
        if (searchInput.value.trim().toLocaleLowerCase() === query) {
            listStatus.textContent = `Pencarian GitHub gagal: ${error.message}`;
            listStatus.dataset.state = "warning";
            listStatus.hidden = false;
        }
    }
}

restoreSavedSearch();
searchInput.addEventListener("input", filterProjects);
document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) {
        event.preventDefault();
        searchInput.focus();
    }
});

loadProjects();