(function() {
    const publicPaths = ['/', '/index.html', '/downloads.html', '/gallery.html', '/updates.html', '/schedule.html', '/contact.html', '/result.html', '/results/index.html'];
    const isPublicPage = window.location.pathname.includes('/public/') || 
                         publicPaths.includes(window.location.pathname) ||
                         (document.body && document.body.classList.contains('public-site'));

    // Only inject 80% zoom CSS on Admin Panel pages, NOT on public website pages
    if (!isPublicPage) {
        const zoomStyle = document.createElement('style');
        zoomStyle.id = 'dynamic-zoom-style';
        zoomStyle.textContent = `
            html {
                zoom: 80% !important;
                width: 125vw !important;
                height: 125vh !important;
                background-color: #f8f9fc !important;
            }
            body {
                width: 100% !important;
                height: 100% !important;
            }
        `;
        if (document.head) {
            document.head.appendChild(zoomStyle);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.head.appendChild(zoomStyle);
            });
        }
    }

    // Function to dynamically update page favicon, title, logo and names based on Firestore config
    function updatePageFaviconAndManifest(data) {
        if (!data) return;
        const name = data.name || 'Festival';
        const logo192 = data.logo192 || data.logo || '';
        const logo512 = data.logo512 || data.logo502 || data.logo || '';

        // 1. Dynamic Favicon & Apple Touch Icon Update
        if (logo512 || logo192) {
            const primaryLogo = logo512 || logo192;
            
            // Find existing icon link elements
            const iconLinks = document.querySelectorAll('link[rel*="icon"]');
            if (iconLinks.length > 0) {
                iconLinks.forEach(link => {
                    if (link.rel.includes('apple-touch-icon')) {
                        if (logo192) link.href = logo192;
                    } else {
                        link.href = primaryLogo;
                    }
                });
            } else {
                const link = document.createElement('link');
                link.rel = 'icon';
                link.href = primaryLogo;
                document.head.appendChild(link);
            }

            let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
            if (appleIcon) {
                if (logo192) appleIcon.href = logo192;
            } else if (logo192) {
                appleIcon = document.createElement('link');
                appleIcon.rel = 'apple-touch-icon';
                appleIcon.href = logo192;
                document.head.appendChild(appleIcon);
            }
        }

        const year = data.year || '2026';
        const yearShort = String(year).length === 4 ? "'" + String(year).slice(-2) : String(year);

        // 2. Dynamic Document Title Update ([Fest Name] | [Page Name])
        if (name) {
            if (isPublicPage) {
                const path = window.location.pathname.toLowerCase();
                let pageName = 'Home';
                if (path.includes('downloads')) {
                    pageName = 'Downloads';
                } else if (path.includes('gallery')) {
                    pageName = 'Gallery';
                } else if (path.includes('updates')) {
                    pageName = 'Updates';
                } else if (path.includes('result')) {
                    pageName = 'Result';
                } else if (path.includes('contact')) {
                    pageName = 'Contact Us';
                }
                document.title = `${name} | ${pageName}`;
            } else {
                // Admin pages
                if (!window._baseInitialTitle) {
                    window._baseInitialTitle = document.title;
                }
                let curTitle = window._baseInitialTitle;
                curTitle = curTitle.replace(/Kauthukam\s*-\s*SFADC\s*Rabee'\s*Arts\s*Fest\s*'(?:25|26)/gi, name);
                curTitle = curTitle.replace(/Kauthukam\s*Arts\s*Fest\s*'(?:25|26)/gi, name);
                curTitle = curTitle.replace(/Rabee'\s*Arts\s*Fest\s*(?:2025|2026)/gi, name);
                curTitle = curTitle.replace(/ArtFest'(?:25|26)/gi, name);
                curTitle = curTitle.replace(/Kauthukam\s*Arts\s*Fest/gi, name);
                curTitle = curTitle.replace(/Kauthukam/gi, name);
                curTitle = curTitle.replace(/ArtFest/gi, name);
                curTitle = curTitle.replace(/\s*\|\s*SIBAQ/gi, '');
                document.title = curTitle;
            }
        }

        // 3. Dynamic DOM Name, Year & Logo Elements Update
        document.querySelectorAll('[data-fest="name"]').forEach(el => {
            el.textContent = name;
        });

        document.querySelectorAll('[data-fest="year"]').forEach(el => {
            el.textContent = year;
        });

        document.querySelectorAll('[data-fest="year-short"]').forEach(el => {
            el.textContent = yearShort;
        });

        document.querySelectorAll('[data-fest="copyright-year"]').forEach(el => {
            el.textContent = year;
        });

        document.querySelectorAll('[data-fest="name-experience"]').forEach(el => {
            el.textContent = 'Experience ' + name + ' ' + yearShort;
        });

        if (data.address) {
            document.querySelectorAll('[data-fest="address"]').forEach(el => {
                el.innerHTML = data.address.replace(/\n/g, '<br>');
            });
        }

        if (logo512 || logo192 || data.logo) {
            const logoUrl = data.logo || logo512 || logo192;
            document.querySelectorAll('[data-fest="logo"], #nav-badge img').forEach(img => {
                if (img && img.tagName === 'IMG') {
                    img.src = logoUrl;
                }
            });
        }

        // 4. Dynamic PWA Manifest Update via Blob URL
        const existingManifest = document.querySelector('link[rel="manifest"]');
        const startUrl = new URL("./index.html", window.location.href).href;
        const icon192Url = logo192 ? logo192 : new URL("./logo-192.svg", window.location.href).href;
        const icon512Url = logo512 ? logo512 : new URL("./logo-512.svg", window.location.href).href;

        const is192Svg = !logo192 || logo192.includes('.svg') || logo192.includes('image/svg+xml');
        const is512Svg = !logo512 || logo512.includes('.svg') || logo512.includes('image/svg+xml');

        const manifestObj = {
            "name": name + " Admin Panel",
            "short_name": name,
            "description": name + " Management System",
            "start_url": startUrl,
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#134E8E",
            "icons": [
                {
                    "src": icon192Url,
                    "sizes": is192Svg ? "any" : "192x192",
                    "type": logo192 ? (logo192.includes('image/webp') ? 'image/webp' : 'image/png') : "image/svg+xml",
                    "purpose": "any maskable"
                },
                {
                    "src": icon512Url,
                    "sizes": is512Svg ? "any" : "512x512",
                    "type": logo512 ? (logo512.includes('image/webp') ? 'image/webp' : 'image/png') : "image/svg+xml",
                    "purpose": "any maskable"
                }
            ]
        };
        
        try {
            const blob = new Blob([JSON.stringify(manifestObj, null, 2)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(blob);
            
            if (existingManifest) {
                existingManifest.href = manifestUrl;
            } else {
                const link = document.createElement('link');
                link.rel = 'manifest';
                link.href = manifestUrl;
                document.head.appendChild(link);
            }
        } catch (e) {
            console.error("Failed to generate dynamic manifest:", e);
        }
    }

    // Expose function globally
    window.updatePageFaviconAndManifest = updatePageFaviconAndManifest;

    let listenerStarted = false;
    
    // Start a listener automatically if Firebase is available, else fallback to REST
    function initListener() {
        if (listenerStarted) return;
        listenerStarted = true;

        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            try {
                const db = firebase.firestore();
                db.collection('config').doc('festData').onSnapshot(doc => {
                    if (doc.exists) updatePageFaviconAndManifest(doc.data());
                }, err => console.warn("Favicon sync error:", err));
                return;
            } catch (e) {
                console.error("Error setting up automatic favicon listener:", e);
            }
        }

        // Direct fetch via REST API with zero timeout loop
        fetch('https://firestore.googleapis.com/v1/projects/festie-s1u2h3/databases/(default)/documents/config/festData')
            .then(res => res.json())
            .then(json => {
                if (json && json.fields) {
                    const doc = json.fields;
                    const data = {};
                    for (const key in doc) {
                        if (doc[key].stringValue !== undefined) data[key] = doc[key].stringValue;
                        else if (doc[key].booleanValue !== undefined) data[key] = doc[key].booleanValue;
                        else if (doc[key].integerValue !== undefined) data[key] = doc[key].integerValue;
                    }
                    updatePageFaviconAndManifest(data);
                }
            })
            .catch(err => console.warn("Favicon REST fetch error:", err));
    }

    // Run when the DOM is ready or immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListener);
    } else {
        initListener();
    }
})();
