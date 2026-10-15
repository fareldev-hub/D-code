const appName = "Code";

function $(query) {
    return document.querySelector(query);
}

const appNameElement = $("#app_name");
if (appNameElement) {
    appNameElement.textContent = appName;
}

const shareButton = $("button.btn-share");
if (shareButton) {
    shareButton.addEventListener("click", async function () {
        const shareData = {
            title: appName,
            text: "Website untuk belajar coding",
            url: window.location.href,
        };

        if (typeof navigator.share === "function") {
            try {
                await navigator.share(shareData);
            } catch (error) {
                if (error.name !== "AbortError") {
                    await Swal.fire({
                        title: "Gagal membagikan",
                        text: error.message || "Terjadi kesalahan saat membagikan website.",
                        icon: "error"
                    });
                }
            }
        } else {
            const result = await Swal.fire({
                title: "Bagikan",
                text: "Salin tautan untuk membagikan halaman ini.",
                input: "text",
                inputValue: shareData.url,
                inputAttributes: {
                    readonly: "readonly",
                    "aria-label": "Tautan halaman"
                },
                showCancelButton: true,
                confirmButtonText: "Salin tautan",
                cancelButtonText: "Tutup",
                showLoaderOnConfirm: true,
                customClass: {
                    popup: "share-dialog",
                    confirmButton: "share-confirm-button",
                    cancelButton: "share-cancel-button"
                },
                showClass: {
                    popup: "share-popup-show"
                },
                hideClass: {
                    popup: "share-popup-hide"
                },
                preConfirm: async () => {
                    try {
                        await copyText(shareData.url);
                    } catch (error) {
                        Swal.showValidationMessage(error.message);
                        return false;
                    }
                }
            });

            if (result.isConfirmed) {
                await Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Tautan berhasil disalin",
                    showConfirmButton: false,
                    timer: 1800,
                    timerProgressBar: true,
                    showClass: {
                        popup: "share-popup-show"
                    }
                });
            }
        }
    });
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();

    const copied = document.execCommand("copy");
    input.remove();

    if (!copied) {
        throw new Error("Browser tidak mengizinkan penyalinan otomatis. Salin tautan secara manual.");
    }
}

const learnButton = $("#btn-learn");
if (learnButton) {
    learnButton.addEventListener("click", function () {
        window.location.href = "/learn";
    });
}

const startButton = $("#btn-start");
if (startButton) {
    startButton.addEventListener("click", function () {
        window.location.href = "/dashboard";
    });
}
