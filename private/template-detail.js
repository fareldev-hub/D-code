const filesStatus = document.querySelector("#files-status");
const fileList = document.querySelector("#file-list");
const sourceFilename = document.querySelector("#source-filename");
const sourceStatus = document.querySelector("#source-status");
const sourceEditor = document.querySelector("#source-editor");
const readmePreview = document.querySelector("#readme-preview");
const sourceCode = document.querySelector("#source-code");
const sourceCodeContent = document.querySelector("#source-code-content");
const sourceLineNumbers = document.querySelector("#source-line-numbers");
const preview = document.querySelector("#project-preview");
const previewPlaceholder = document.querySelector("#preview-placeholder");
const previewOpenLink = document.querySelector("#preview-open-link");
const runButton = document.querySelector("#run-preview");
const previewState = document.querySelector("#preview-state");
const downloadRepositoryLink = document.querySelector("#download-repository-link");
const editorProjectTitle = document.querySelector("#editor-project-title");
const explorerRepository = document.querySelector("#explorer-repository");
const activeFileTab = document.querySelector("#active-file-tab");
const explorerToggle = document.querySelector("#toggle-explorer");
const explorerBackdrop = document.querySelector("#explorer-backdrop");

let sourceRequest;
let selectedPreviewUrl = "";
let explorerOpen = true;
let previewMode = "none";
let sourcePreviewHtml = "";
let previewLoadTimer = null;
const mobileViewport = window.matchMedia("(max-width: 680px)");

function getRawUrl(project, filePath) {
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    return `https://raw.githubusercontent.com/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.repository)}/${encodeURIComponent(project.branch)}/${encodedPath}`;
}

function getRepoPathFromReference(reference, fromFile) {
    if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) {
        return null;
    }
    const pathname = reference.split(/[?#]/, 1)[0];
    const segments = pathname.startsWith("/")
        ? []
        : fromFile.split("/").slice(0, -1);

    for (const segment of pathname.split("/")) {
        if (!segment || segment === ".") continue;
        if (segment === "..") {
            if (segments.length === 0) return null;
            segments.pop();
            continue;
        }
        try {
            segments.push(decodeURIComponent(segment));
        } catch {
            return null;
        }
    }
    return segments.join("/");
}

function updateLineNumbers(code) {
    const lineCount = Math.max(1, code.split("\n").length);
    const fragment = document.createDocumentFragment();
    for (let line = 1; line <= lineCount; line += 1) {
        const number = document.createElement("span");
        number.textContent = String(line);
        fragment.append(number);
    }
    sourceLineNumbers.replaceChildren(fragment);
}

function setPreviewLayout(hasPreview) {
    document.body.classList.toggle("code-only", !hasPreview);
    runButton.hidden = !hasPreview;
}

function parseRepositoryUrl(repositoryUrl) {
    const url = new URL(repositoryUrl);
    if (url.hostname !== "github.com") {
        throw new Error("Repository katalog harus berasal dari GitHub.");
    }
    const [owner, repository] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repository) {
        throw new Error("URL repository tidak valid.");
    }
    return { owner, repository: repository.replace(/\.git$/i, "") };
}

function parseProjectEntry(entry) {
    if (typeof entry === "string") {
        return { url: entry, previewUrl: "" };
    }
    if (entry && typeof entry === "object" && typeof entry.url === "string") {
        return {
            url: entry.url,
            previewUrl: typeof entry.previewUrl === "string" ? entry.previewUrl : ""
        };
    }
    return null;
}

function getFileLanguage(filePath) {
    const extension = filePath.split(".").pop().toLowerCase();
    const languages = {
        css: "css",
        html: "xml",
        htm: "xml",
        js: "javascript",
        jsx: "javascript",
        json: "json",
        md: "markdown",
        mjs: "javascript",
        ts: "typescript",
        tsx: "typescript",
        txt: "plaintext",
        xml: "xml",
        yml: "yaml",
        yaml: "yaml"
    };
    return languages[extension] || "plaintext";
}

function showSourceMessage(message, isError = false) {
    sourceStatus.textContent = message;
    sourceStatus.dataset.state = isError ? "error" : "";
    sourceStatus.hidden = false;
    sourceEditor.hidden = true;
    readmePreview.hidden = true;
}

function renderMarkdown(markdown) {
    if (!window.marked || typeof window.marked.parse !== "function"
        || !window.DOMPurify || typeof window.DOMPurify.sanitize !== "function") {
        throw new Error("Markdown renderer tidak tersedia.");
    }
    readmePreview.innerHTML = window.DOMPurify.sanitize(window.marked.parse(markdown));
    readmePreview.hidden = false;
    sourceStatus.hidden = true;
    sourceEditor.hidden = true;
}

async function loadSourceFile(project, filePath, selectedButton) {
    if (sourceRequest) {
        sourceRequest.abort();
    }
    sourceRequest = new AbortController();
    const { signal } = sourceRequest;

    fileList.querySelectorAll(".file-list button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button === selectedButton));
    });
    sourceFilename.textContent = filePath;
    activeFileTab.innerHTML = "";
    const fileIcon = document.createElement("i");
    fileIcon.className = "fas fa-code";
    fileIcon.setAttribute("aria-hidden", "true");
    activeFileTab.append(fileIcon, document.createTextNode(` ${filePath.split("/").pop()}`));
    sourceCodeContent.textContent = "";
    sourceLineNumbers.replaceChildren();
    readmePreview.replaceChildren();
    showSourceMessage("Mengambil file dari GitHub...");

    try {
        const response = await fetch(getRawUrl(project, filePath), {
            signal,
            headers: { Accept: "text/plain" }
        });
        if (!response.ok) {
            throw new Error(`GitHub mengembalikan status ${response.status}.`);
        }

        const code = await response.text();
        if (!code.trim()) {
            throw new Error("File ini tidak berisi teks untuk ditampilkan.");
        }

        if (/\.md$/i.test(filePath)) {
            renderMarkdown(code);
            return;
        }

        sourceCodeContent.textContent = code;
        sourceCodeContent.removeAttribute("data-highlighted");
        sourceCodeContent.className = `language-${getFileLanguage(filePath)}`;
        sourceStatus.hidden = true;
        sourceEditor.hidden = false;
        updateLineNumbers(code);

        if (window.hljs) {
            try {
                window.hljs.highlightElement(sourceCodeContent);
            } catch (error) {
                sourceStatus.textContent = `Syntax highlighting gagal: ${error.message}. Kode tetap ditampilkan sebagai teks biasa.`;
                sourceStatus.dataset.state = "warning";
                sourceStatus.hidden = false;
            }
        } else {
            sourceStatus.textContent = "Syntax highlighting tidak tersedia; kode ditampilkan sebagai teks biasa.";
            sourceStatus.dataset.state = "warning";
            sourceStatus.hidden = false;
        }
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }
        showSourceMessage(`File tidak dapat dimuat: ${error.message}`, true);
    }
}

function createFileButton(project, filePath) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-list-item repository-file-button";
    button.setAttribute("aria-pressed", "false");
    button.title = filePath;

    const icon = document.createElement("i");
    icon.className = filePath.endsWith("/") ? "fas fa-folder" : "fas fa-file-code";
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.textContent = filePath;
    button.append(icon, name);
    button.addEventListener("click", () => {
        loadSourceFile(project, filePath, button);
        if (window.matchMedia("(max-width: 680px)").matches && explorerOpen) {
            toggleExplorer();
        }
    });
    return button;
}

function createFileTree(files) {
    const root = { directories: new Map(), files: [] };

    files.forEach((filePath) => {
        const parts = filePath.split("/");
        const filename = parts.pop();
        let directory = root;

        parts.forEach((part) => {
            if (!directory.directories.has(part)) {
                directory.directories.set(part, { directories: new Map(), files: [] });
            }
            directory = directory.directories.get(part);
        });

        directory.files.push({ name: filename, path: filePath });
    });

    return root;
}

let folderId = 0;

function renderFileTree(tree, project, depth = 0) {
    const entries = [
        ...Array.from(tree.directories, ([name, contents]) => ({ name, type: "directory", contents })),
        ...tree.files.map((file) => ({ ...file, type: "file" }))
    ].sort((first, second) => first.name.localeCompare(second.name));

    return entries.map((entry) => {
        if (entry.type === "file") {
            return createFileButton(project, entry.path);
        }

        const folder = document.createElement("div");
        folder.className = "file-list-directory";

        const folderButton = document.createElement("button");
        folderButton.type = "button";
        folderButton.className = "file-list-item file-list-folder";
        folderButton.setAttribute("aria-expanded", "true");
        folderButton.setAttribute("aria-controls", `repository-folder-${folderId}`);
        folderButton.style.setProperty("--folder-depth", depth);

        const chevron = document.createElement("i");
        chevron.className = "fas fa-chevron-down folder-chevron";
        chevron.setAttribute("aria-hidden", "true");
        const icon = document.createElement("i");
        icon.className = "fas fa-folder-open folder-icon";
        icon.setAttribute("aria-hidden", "true");
        const name = document.createElement("span");
        name.textContent = entry.name;
        folderButton.append(chevron, icon, name);

        const children = document.createElement("div");
        children.className = "file-list-folder-children";
        children.id = `repository-folder-${folderId}`;
        folderId += 1;
        children.append(...renderFileTree(entry.contents, project, depth + 1));
        folderButton.addEventListener("click", () => {
            const isExpanded = folderButton.getAttribute("aria-expanded") === "true";
            folderButton.setAttribute("aria-expanded", String(!isExpanded));
            children.hidden = isExpanded;
            chevron.classList.toggle("fa-chevron-down", !isExpanded);
            chevron.classList.toggle("fa-chevron-right", isExpanded);
            icon.classList.toggle("fa-folder-open", !isExpanded);
            icon.classList.toggle("fa-folder", isExpanded);
        });
        folder.append(folderButton, children);
        return folder;
    });
}

function toggleExplorer() {
    setExplorerOpen(!explorerOpen);
}

function setExplorerOpen(isOpen) {
    explorerOpen = isOpen;
    document.body.classList.toggle("explorer-is-open", explorerOpen);
    explorerToggle.setAttribute("aria-expanded", String(explorerOpen));
}

function clearPreviewTimer() {
    if (previewLoadTimer) {
        clearTimeout(previewLoadTimer);
        previewLoadTimer = null;
    }
}

function markPreviewReady() {
    clearPreviewTimer();
    previewPlaceholder.hidden = true;
    previewState.textContent = "Siap";
}

function markPreviewFailed(message) {
    clearPreviewTimer();
    previewPlaceholder.hidden = false;
    previewPlaceholder.querySelector("span").textContent = message;
    previewState.textContent = "Gagal";
}

function isPreviewableUrl(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url);
}

function configurePreview(project) {
    selectedPreviewUrl = isPreviewableUrl(project.previewUrl) ? project.previewUrl : "";
    previewMode = selectedPreviewUrl ? "remote" : "none";
    setPreviewLayout(Boolean(selectedPreviewUrl));
    previewState.textContent = selectedPreviewUrl ? "Memuat..." : "Mencari file HTML...";
    previewPlaceholder.querySelector("span").textContent = selectedPreviewUrl
        ? "Memuat pratinjau proyek..."
        : "Mencari file HTML untuk membuat pratinjau...";
    previewPlaceholder.hidden = false;
    preview.hidden = true;
    previewOpenLink.href = selectedPreviewUrl || "#";
    previewOpenLink.hidden = !selectedPreviewUrl;
    runButton.disabled = !selectedPreviewUrl;
    if (selectedPreviewUrl) {
        preview.hidden = false;
        preview.src = selectedPreviewUrl;
        previewLoadTimer = setTimeout(() => {
            if (!previewPlaceholder.hidden) {
                markPreviewReady();
            }
        }, 8000);
    }
}

function activateRemotePreview(url, label = "Pratinjau eksternal") {
    clearPreviewTimer();
    selectedPreviewUrl = url;
    previewMode = "remote";
    setPreviewLayout(true);
    previewOpenLink.href = url;
    previewOpenLink.hidden = false;
    runButton.disabled = false;
    previewState.textContent = "Memuat...";
    previewPlaceholder.querySelector("span").textContent = `Memuat ${label}...`;
    previewPlaceholder.hidden = false;
    preview.hidden = false;
    preview.src = url;
    previewLoadTimer = setTimeout(() => {
        if (!previewPlaceholder.hidden) {
            markPreviewReady();
        }
    }, 10000);
}

function createSourcePreview(project, htmlFile, htmlSource) {
    const documentParser = new DOMParser();
    const previewDocument = documentParser.parseFromString(htmlSource, "text/html");
    const base = previewDocument.createElement("base");
    const htmlDirectory = htmlFile.split("/").slice(0, -1).join("/");
    const baseFile = htmlDirectory ? `${htmlDirectory}/index.html` : "index.html";
    base.href = getRawUrl(project, baseFile).replace(/index\.html$/, "");
    previewDocument.head.prepend(base);

    const resourceAttributes = [
        ["script[src]", "src"],
        ["link[href]", "href"],
        ["img[src]", "src"],
        ["source[src]", "src"],
        ["video[poster]", "poster"],
        ["audio[src]", "src"]
    ];
    resourceAttributes.forEach(([selector, attribute]) => {
        previewDocument.querySelectorAll(selector).forEach((element) => {
            const repoPath = getRepoPathFromReference(element.getAttribute(attribute), htmlFile);
            if (repoPath) {
                element.setAttribute(attribute, getRawUrl(project, repoPath));
            }
        });
    });

    return `<!doctype html>${previewDocument.documentElement.outerHTML}`;
}

async function loadSourcePreview(project, files) {
    const htmlFiles = files.filter((filePath) => /\.html?$/i.test(filePath));
    const previewFile = htmlFiles.includes("index.html")
        ? "index.html"
        : htmlFiles.find((filePath) => !filePath.split("/").pop().startsWith("."));

    if (!previewFile) {
        throw new Error("Repository ini tidak memiliki file HTML untuk pratinjau.");
    }

    previewMode = "source";
    setPreviewLayout(true);
    previewState.textContent = "Menyusun dari source...";
    previewPlaceholder.querySelector("span").textContent = "Menyusun pratinjau dari HTML, CSS, dan JavaScript repository...";
    previewPlaceholder.hidden = false;
    preview.hidden = true;
    previewOpenLink.hidden = true;
    runButton.disabled = true;

    const response = await fetch(getRawUrl(project, previewFile), {
        headers: { Accept: "text/html, text/plain" }
    });
    if (!response.ok) {
        throw new Error(`File HTML pratinjau tidak dapat dimuat (HTTP ${response.status}).`);
    }
    const htmlSource = await response.text();

    const needsBuild =
        /<script[^>]+type=["']module["']/i.test(htmlSource) ||
        /<script[^>]+src=["'][^"']*\.jsx?["']/i.test(htmlSource) ||
        /from\s+["'][^"']+\.(jsx?|tsx?)["']/i.test(htmlSource) ||
        /import\s+React/i.test(htmlSource);

    if (needsBuild) {
        throw new Error(
            "Proyek ini memerlukan build (React/Vite/Webpack) sehingga tidak bisa dijalankan langsung dari source."
        );
    }

    sourcePreviewHtml = createSourcePreview(project, previewFile, htmlSource);
    preview.srcdoc = sourcePreviewHtml;
    preview.hidden = false;
    runButton.disabled = false;

    clearPreviewTimer();
    previewLoadTimer = setTimeout(() => {
        if (!previewPlaceholder.hidden) {
            markPreviewReady();
        }
    }, 3000);
}

function resolveFallbackPreviewUrl(project, repoHomepage) {
    if (isPreviewableUrl(project.previewUrl)) {
        return project.previewUrl;
    }
    if (isPreviewableUrl(repoHomepage)) {
        return repoHomepage;
    }
    return `https://${project.owner}.github.io/${project.repository}/`;
}

async function loadProject() {
    const [, , owner, repository] = window.location.pathname.split("/");
    if (!owner || !repository) {
        throw new Error("Alamat proyek tidak valid.");
    }

    const projectsResponse = await fetch("/projects.json", {
        headers: { Accept: "application/json" }
    });
    if (!projectsResponse.ok) {
        throw new Error(`Daftar proyek tidak dapat dimuat (HTTP ${projectsResponse.status}).`);
    }

    const data = await projectsResponse.json();
    let matchedEntry = null;
    for (const rawEntry of data.projects || []) {
        const entry = parseProjectEntry(rawEntry);
        if (!entry) continue;
        try {
            const parsedUrl = parseRepositoryUrl(entry.url);
            if (parsedUrl.owner === owner && parsedUrl.repository === repository) {
                matchedEntry = entry;
                break;
            }
        } catch {
            continue;
        }
    }
    if (!matchedEntry) {
        throw new Error("Proyek ini tidak ada di katalog.");
    }

    let branch = "main";
    let repoHomepage = "";
    let files = [];

    try {
        const apiResponse = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
            { headers: { Accept: "application/vnd.github+json" } }
        );
        if (apiResponse.ok) {
            const repo = await apiResponse.json();
            branch = repo.default_branch || "main";
            repoHomepage = typeof repo.homepage === "string" ? repo.homepage : "";
        }
    } catch {
        // abaikan
    }

    const project = {
        owner,
        repository,
        branch,
        previewUrl: matchedEntry.previewUrl || repoHomepage || ""
    };

    if (mobileViewport.matches) {
        setExplorerOpen(false);
    }

    editorProjectTitle.textContent = "D-code Editor";
    explorerRepository.textContent = "PROJECT";
    const encodedBranch = project.branch.split("/").map(encodeURIComponent).join("/");
    downloadRepositoryLink.href = `https://codeload.github.com/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.repository)}/zip/refs/heads/${encodedBranch}`;
    downloadRepositoryLink.download = `${project.repository}.zip`;
    downloadRepositoryLink.hidden = false;

    try {
        const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/trees/${encodeURIComponent(project.branch)}?recursive=1`;
        const treeResponse = await fetch(treeUrl, {
            headers: { Accept: "application/vnd.github+json" }
        });
        if (treeResponse.ok) {
            const tree = await treeResponse.json();
            if (!tree.truncated) {
                files = tree.tree
                    .filter((item) => item.type === "blob" && !item.path.startsWith(".git/"))
                    .map((item) => item.path)
                    .sort((a, b) => a.localeCompare(b));
            }
        }
    } catch {
        // lanjut
    }

    if (files.length === 0) {
        try {
            const jsdelivrRes = await fetch(
                `https://data.jsdelivr.com/v1/packages/gh/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}@${encodeURIComponent(project.branch)}?structure=flat`
            );
            if (jsdelivrRes.ok) {
                const jsdelivrData = await jsdelivrRes.json();
                if (jsdelivrData && Array.isArray(jsdelivrData.files)) {
                    files = jsdelivrData.files
                        .filter((item) => item.type === "file" && !item.name.startsWith(".git/"))
                        .map((item) => item.name)
                        .sort((a, b) => a.localeCompare(b));
                }
            }
        } catch {
            // gagal total
        }
    }

    if (files.length === 0) {
        throw new Error("Tidak dapat memuat daftar file dari GitHub maupun jsDelivr.");
    }

    configurePreview(project);

    folderId = 0;
    fileList.replaceChildren(...renderFileTree(createFileTree(files), project));
    filesStatus.hidden = true;

    if (!project.previewUrl) {
        try {
            await loadSourcePreview(project, files);
        } catch (error) {
            const fallbackUrl = resolveFallbackPreviewUrl(project, repoHomepage);
            if (fallbackUrl) {
                project.previewUrl = fallbackUrl;
                activateRemotePreview(
                    fallbackUrl,
                    "pratinjau eksternal (source tidak bisa dijalankan langsung)"
                );
            } else {
                previewMode = "none";
                setPreviewLayout(false);
                preview.hidden = true;
                previewState.textContent = "Tidak tersedia";
                previewPlaceholder.querySelector("span").textContent =
                    `Pratinjau source tidak dapat dibuat: ${error.message}`;
                previewPlaceholder.hidden = false;
            }
        }
    }

    const initialFile = files.includes("index.html")
        ? "index.html"
        : files.find((filePath) => filePath.toLowerCase().endsWith(".html")) || files[0];
    const initialButton = Array.from(fileList.querySelectorAll(".repository-file-button"))
        .find((button) => button.title === initialFile);
    if (initialButton) {
        await loadSourceFile(project, initialFile, initialButton);
    }
}

loadProject().catch((error) => {
    filesStatus.textContent = error.message;
    filesStatus.dataset.state = "error";
    filesStatus.hidden = false;
    previewPlaceholder.querySelector("span").textContent = "Tidak dapat memuat pratinjau proyek.";
});

function reloadPreview() {
    clearPreviewTimer();
    previewState.textContent = "Memuat ulang...";
    previewPlaceholder.querySelector("span").textContent = "Memuat ulang pratinjau...";
    previewPlaceholder.hidden = false;
    preview.hidden = false;
    if (previewMode === "remote") {
        preview.src = selectedPreviewUrl;
        previewLoadTimer = setTimeout(() => {
            if (!previewPlaceholder.hidden) {
                markPreviewReady();
            }
        }, 10000);
    } else if (previewMode === "source") {
        preview.srcdoc = sourcePreviewHtml;
        previewLoadTimer = setTimeout(() => {
            if (!previewPlaceholder.hidden) {
                markPreviewReady();
            }
        }, 3000);
    } else {
        markPreviewFailed("Tidak ada pratinjau yang tersedia.");
    }
}

explorerToggle.addEventListener("click", toggleExplorer);
explorerBackdrop.addEventListener("click", toggleExplorer);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileViewport.matches && explorerOpen) {
        setExplorerOpen(false);
        explorerToggle.focus();
    }
});

mobileViewport.addEventListener("change", (event) => {
    setExplorerOpen(!event.matches);
});

preview.addEventListener("load", () => {
    if (previewMode !== "none") {
        markPreviewReady();
    }
});

preview.addEventListener("error", () => {
    if (previewMode !== "none") {
        markPreviewFailed("Gagal memuat pratinjau (resource error).");
    }
});

sourceCode.addEventListener("scroll", () => {
    sourceLineNumbers.scrollTop = sourceCode.scrollTop;
});

runButton.addEventListener("click", reloadPreview);