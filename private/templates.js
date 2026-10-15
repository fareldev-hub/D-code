const projectList = document.querySelector("#project-list");
const listStatus = document.querySelector("#project-list-status");
const projectCount = document.querySelector("#project-count");
const searchInput = document.querySelector("#project-search");
const emptyState = document.querySelector("#project-empty-state");

let projects = [];

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

async function fetchProject(repositoryUrl) {
    const { owner, repository } = parseRepositoryUrl(repositoryUrl);
    const response = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
        { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!response.ok) {
        throw new Error(`GitHub tidak dapat memuat ${owner}/${repository} (HTTP ${response.status}).`);
    }

    const repo = await response.json();
    return {
        owner: repo.owner.login,
        repository: repo.name,
        name: repo.name,
        author: repo.owner.login,
        description: repo.description || "",
        language: repo.language || "code",
        url: repo.html_url
    };
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
        if (!Array.isArray(data.projects) || data.projects.length === 0) {
            throw new Error("Belum ada proyek yang tersedia.");
        }

        const results = await Promise.allSettled(data.projects.map(fetchProject));
        projects = results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);
        const errors = results.filter((result) => result.status === "rejected");
        if (projects.length === 0) {
            throw new Error(errors.map((result) => result.reason.message).join(" "));
        }

        projectCount.textContent = String(projects.length);
        projectList.replaceChildren(...projects.map(createProjectCard));
        listStatus.hidden = true;
        filterProjects();
        if (errors.length > 0) {
            listStatus.textContent = `${errors.length} repository tidak dapat dimuat dari GitHub.`;
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
    let visibleCount = 0;

    projectList.querySelectorAll(".project-card").forEach((card) => {
        const matches = card.dataset.search.includes(query);
        card.hidden = !matches;
        if (matches) visibleCount += 1;
    });

    projectCount.textContent = String(visibleCount);
    emptyState.hidden = visibleCount > 0;
}

searchInput.addEventListener("input", filterProjects);
document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) {
        event.preventDefault();
        searchInput.focus();
    }
});

loadProjects();
