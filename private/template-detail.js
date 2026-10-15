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

function getFileLanguage(filePath) {
    const extension = filePath.split(".").pop().toLowerCase();
    const languages = {
        css: "css",
        html: "xml",
        htm: "xml",
        js: "javascript",
        json: "json",
        md: "markdown",
        mjs: "javascript",
        ts: "typescript",
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

function configurePreview(project) {
    selectedPreviewUrl = typeof project.previewUrl === "string" && project.previewUrl.startsWith("https://")
        ? project.previewUrl
        : "";
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
    }
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
        previewMode = "none";
        setPreviewLayout(false);
        preview.hidden = true;
        previewOpenLink.hidden = true;
        previewState.textContent = "Tidak tersedia";
        previewPlaceholder.querySelector("span").textContent = "Repository ini tidak memiliki file HTML untuk pratinjau.";
        previewPlaceholder.hidden = false;
        return;
    }

    previewMode = "source";
    setPreviewLayout(true);
    previewState.textContent = "Menyusun dari source...";
    previewPlaceholder.querySelector("span").textContent = "Menyusun pratinjau dari HTML, CSS, dan JavaScript repository...";
    previewPlaceholder.hidden = false;
    preview.hidden = true;
    previewOpenLink.hidden = true;

    const response = await fetch(getRawUrl(project, previewFile), {
        headers: { Accept: "text/html, text/plain" }
    });
    if (!response.ok) {
        throw new Error(`File HTML pratinjau tidak dapat dimuat (HTTP ${response.status}).`);
    }
    const htmlSource = await response.text();
    sourcePreviewHtml = createSourcePreview(project, previewFile, htmlSource);
    preview.srcdoc = sourcePreviewHtml;
    preview.hidden = false;
    runButton.disabled = false;
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
    const repositoryUrl = data.projects.find((url) => {
        try {
            const parsedUrl = parseRepositoryUrl(url);
            return parsedUrl.owner === owner && parsedUrl.repository === repository;
        } catch {
            return false;
        }
    });
    if (!repositoryUrl) {
        throw new Error("Proyek ini tidak ada di katalog.");
    }
    const apiResponse = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
        { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!apiResponse.ok) {
        throw new Error(`Detail repository GitHub tidak dapat dimuat (HTTP ${apiResponse.status}).`);
    }
    const repo = await apiResponse.json();
    const project = {
        owner: repo.owner.login,
        repository: repo.name,
        branch: repo.default_branch,
        previewUrl: typeof repo.homepage === "string" && repo.homepage.startsWith("https://")
            ? repo.homepage
            : ""
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
    const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/trees/${encodeURIComponent(project.branch)}?recursive=1`;
    const treeResponse = await fetch(treeUrl, {
        headers: { Accept: "application/vnd.github+json" }
    });
    if (!treeResponse.ok) {
        throw new Error(`Daftar file GitHub tidak dapat dimuat (HTTP ${treeResponse.status}).`);
    }
    const tree = await treeResponse.json();
    if (tree.truncated) {
        throw new Error("Repository terlalu besar untuk menampilkan seluruh daftar file.");
    }
    const files = tree.tree
        .filter((item) => item.type === "blob" && !item.path.startsWith(".git/"))
        .map((item) => item.path)
        .sort((first, second) => first.localeCompare(second));
    if (files.length === 0) {
        throw new Error("Repository tidak memiliki file yang dapat ditampilkan.");
    }
    configurePreview(project);

    folderId = 0;
    fileList.replaceChildren(...renderFileTree(createFileTree(files), project));
    filesStatus.hidden = true;
    if (!project.previewUrl) {
        try {
            await loadSourcePreview(project, files);
        } catch (error) {
            previewMode = "none";
            setPreviewLayout(false);
            preview.hidden = true;
            previewState.textContent = "Tidak tersedia";
            previewPlaceholder.querySelector("span").textContent = `Pratinjau source tidak dapat dibuat: ${error.message}`;
            previewPlaceholder.hidden = false;
            filesStatus.textContent = `Pratinjau tidak tersedia: ${error.message}`;
            filesStatus.dataset.state = "warning";
            filesStatus.hidden = false;
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
    previewPlaceholder.querySelector("span").textContent = "Tidak dapat memuat pratinjau proyek.";
});

function reloadPreview() {
    previewState.textContent = "Memuat ulang...";
    previewPlaceholder.querySelector("span").textContent = "Memuat ulang pratinjau...";
    previewPlaceholder.hidden = false;
    preview.hidden = false;
    if (previewMode === "remote") {
        preview.src = selectedPreviewUrl;
    } else if (previewMode === "source") {
        preview.srcdoc = sourcePreviewHtml;
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
    previewPlaceholder.hidden = true;
    previewState.textContent = "Siap";
});

sourceCode.addEventListener("scroll", () => {
    sourceLineNumbers.scrollTop = sourceCode.scrollTop;
});

runButton.addEventListener("click", reloadPreview);
