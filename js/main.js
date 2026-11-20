/**
 * Justin Liu — Field Notes
 * Hand-written vanilla JavaScript. No frameworks.
 *
 * Responsibilities:
 *  - theme + mobile navigation
 *  - journal index (search, categories, dynamic entries)
 *  - single-note page (Markdown, TOC, code copy, reading progress)
 *  - CV language tabs + print
 */

(function () {
    'use strict';

    var root = document.documentElement;
    var THEME_KEY = 'jl-theme';

    function $(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function $$(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    function escapeHtml(value) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return map[character];
        });
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            var context = this;
            var args = arguments;
            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                fn.apply(context, args);
            }, wait);
        };
    }

    function currentTheme() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* ----------------------------------------------------------------------
       Theme
       ---------------------------------------------------------------------- */
    function applyTheme(theme, persist) {
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }

        var themeColor = $('#themeColor');
        if (themeColor) {
            themeColor.setAttribute('content', theme === 'dark' ? '#16120e' : '#f2ecdf');
        }

        var toggle = $('#themeToggle');
        if (toggle) {
            var label = $('[data-theme-label]', toggle);
            var isDark = theme === 'dark';
            toggle.setAttribute('aria-pressed', String(isDark));
            toggle.setAttribute('aria-label', isDark ? 'Switch to day edition' : 'Switch to night edition');
            if (label) {
                label.textContent = isDark ? 'Day' : 'Night';
            }
        }

        if (persist !== false) {
            try {
                localStorage.setItem(THEME_KEY, theme);
            } catch (error) { /* storage can be unavailable */ }
        }

        if (typeof window.__jlRerenderMermaid === 'function') {
            window.__jlRerenderMermaid();
        }
    }

    function initTheme() {
        var stored = null;
        try {
            stored = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme');
        } catch (error) { /* storage can be unavailable */ }

        var initial = root.getAttribute('data-theme') === 'dark'
            ? 'dark'
            : (stored === 'dark' ? 'dark' : 'light');

        applyTheme(initial, false);

        var toggle = $('#themeToggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
            });
        }
    }

    /* ----------------------------------------------------------------------
       Small page details
       ---------------------------------------------------------------------- */
    function initClock() {
        var element = $('#localTime');
        if (!element) return;

        function tick() {
            try {
                element.textContent = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Shanghai',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).format(new Date());
            } catch (error) {
                element.textContent = '--:--';
            }
        }

        tick();
        window.setInterval(tick, 30000);
    }

    function initYear() {
        var element = $('#year');
        if (element) {
            element.textContent = String(new Date().getFullYear());
        }
    }

    function initNavigation() {
        var toggle = $('#menuToggle');
        var nav = $('#siteNav');
        if (!toggle || !nav) return;

        function setOpen(open) {
            nav.classList.toggle('is-open', open);
            toggle.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('nav-open', open);

            var label = $('[data-menu-label]', toggle);
            if (label) {
                label.textContent = open ? 'Close' : 'Menu';
            }

            if (open) {
                var firstLink = nav.querySelector('a');
                if (firstLink) {
                    firstLink.focus({ preventScroll: true });
                }
            }
        }

        toggle.addEventListener('click', function () {
            setOpen(!nav.classList.contains('is-open'));
        });

        nav.addEventListener('click', function (event) {
            if (event.target.closest('a')) {
                setOpen(false);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (!nav.classList.contains('is-open')) return;

            if (event.key === 'Escape') {
                setOpen(false);
                toggle.focus();
                return;
            }

            if (event.key === 'Tab') {
                var links = $$('a', nav);
                if (!links.length) return;
                var first = links[0];
                var last = links[links.length - 1];

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        if (window.matchMedia) {
            var desktop = window.matchMedia('(min-width: 981px)');
            var closeOnDesktop = function (event) {
                if (event.matches) setOpen(false);
            };

            if (desktop.addEventListener) {
                desktop.addEventListener('change', closeOnDesktop);
            } else if (desktop.addListener) {
                desktop.addListener(closeOnDesktop);
            }
        }
    }

    /* ----------------------------------------------------------------------
       Reveal on scroll
       ---------------------------------------------------------------------- */
    var revealObserver = null;

    function initReveals(scope) {
        var targets = $$('.reveal:not(.is-visible)', scope || document);
        if (!targets.length) return;

        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            targets.forEach(function (element) {
                element.classList.add('is-visible');
            });
            return;
        }

        if (!revealObserver) {
            revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '0px 0px -5% 0px',
                threshold: 0.05
            });
        }

        targets.forEach(function (element) {
            if (element.getAttribute('data-reveal-ready') === 'true') return;
            element.setAttribute('data-reveal-ready', 'true');

            if (element.getBoundingClientRect().top < window.innerHeight) {
                element.classList.add('is-visible');
            } else {
                revealObserver.observe(element);
            }
        });
    }

    /* ----------------------------------------------------------------------
       Journal data
       ---------------------------------------------------------------------- */
    var postsPromise = null;

    function fetchPosts() {
        if (postsPromise) return postsPromise;

        postsPromise = fetch('posts/posts.json', { cache: 'no-cache' })
            .then(function (response) {
                if (!response.ok) throw new Error('posts.json responded with ' + response.status);
                return response.json();
            })
            .then(function (data) {
                if (!data || !Array.isArray(data.posts)) {
                    throw new Error('posts.json is missing the posts array');
                }
                return data;
            });

        return postsPromise;
    }

    function parseDate(value) {
        if (!value) return null;
        var date = new Date(value + 'T12:00:00');
        return isNaN(date.getTime()) ? null : date;
    }

    function dateValue(value) {
        var date = parseDate(value);
        return date ? date.getTime() : 0;
    }

    function byDateDesc(a, b) {
        return dateValue(b.date) - dateValue(a.date);
    }

    function byDateAsc(a, b) {
        return dateValue(a.date) - dateValue(b.date);
    }

    function formatDate(value, longForm) {
        var date = parseDate(value);
        if (!date) return value || '';
        try {
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: longForm ? 'long' : 'short',
                year: 'numeric'
            }).format(date);
        } catch (error) {
            return value;
        }
    }

    function formatDateUpper(value) {
        return formatDate(value, false).toUpperCase();
    }

    function formatCategory(value) {
        return String(value || 'note')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function entryTemplate(post, index) {
        var title = escapeHtml(post.title || 'Untitled note');
        var href = escapeHtml('post.html?id=' + encodeURIComponent(post.id));
        var titleLang = /[㐀-鿿]/.test(post.title || '') ? ' lang="zh-CN"' : '';
        var summaryLang = /[㐀-鿿]/.test(post.summary || '') ? ' lang="zh-CN"' : '';
        var alt = post.title_en && post.title_en !== post.title
            ? '<p class="entry__alt">' + escapeHtml(post.title_en) + '</p>'
            : '';
        var summary = post.summary
            ? '<p class="entry__summary"' + summaryLang + '>' + escapeHtml(post.summary) + '</p>'
            : '';

        return '<article class="entry reveal">' +
            '<span class="entry__index">' + String(index + 1).padStart(2, '0') + '</span>' +
            '<div class="entry__meta">' +
                '<span>' + escapeHtml(formatCategory(post.category)) + '</span>' +
                '<time datetime="' + escapeHtml(post.date || '') + '">' + escapeHtml(formatDateUpper(post.date)) + '</time>' +
            '</div>' +
            '<div class="entry__body">' +
                '<h3 class="entry__title"' + titleLang + '><a href="' + href + '">' + title + '</a></h3>' +
                alt +
                summary +
            '</div>' +
            '<span class="entry__arrow" aria-hidden="true">↗</span>' +
        '</article>';
    }

    function initFeatured() {
        var container = $('#featuredPosts');
        if (!container) return;

        fetchPosts().then(function (data) {
            var posts = data.posts.slice().sort(byDateDesc);
            var requested = (container.getAttribute('data-featured') || '')
                .split(',')
                .map(function (id) { return id.trim(); })
                .filter(Boolean);
            var selected = [];

            requested.forEach(function (id) {
                var match = posts.find(function (post) { return post.id === id; });
                if (match && selected.indexOf(match) === -1) {
                    selected.push(match);
                }
            });

            posts.forEach(function (post) {
                if (selected.length < 4 && selected.indexOf(post) === -1) {
                    selected.push(post);
                }
            });

            selected = selected.slice(0, 4);

            if (!selected.length) {
                container.innerHTML = '<div class="empty-state"><p class="kicker">No notes yet</p><h2>The ink is still drying.</h2><p>New notes will appear here as they are written.</p></div>';
                return;
            }

            container.innerHTML = selected.map(entryTemplate).join('');
            initReveals(container);
        }).catch(function (error) {
            container.innerHTML = '<p class="loading-line">The notes could not be loaded. <a href="blog.html">Open the notes</a>.</p>';
            if (window.console && console.warn) console.warn('Notes index:', error);
        });
    }

    function initBlog() {
        var list = $('#journalList');
        if (!list) return;

        var search = $('#searchInput');
        var filters = $('#categoryFilters');
        var resultCount = $('#resultCount');
        var resultLabel = $('#resultLabel');
        var archiveCount = $('#archiveCount');
        var state = { category: 'all', query: '' };
        var posts = [];
        var categories = [];

        function syncUrl() {
            try {
                var url = new URL(window.location.href);
                if (state.query) url.searchParams.set('q', state.query);
                else url.searchParams.delete('q');
                if (state.category !== 'all') url.searchParams.set('category', state.category);
                else url.searchParams.delete('category');
                window.history.replaceState({}, '', url.toString());
            } catch (error) { /* headless or file:// contexts */ }
        }

        function syncFilterButtons() {
            if (!filters) return;
            $$('.filter-btn', filters).forEach(function (button) {
                var active = button.getAttribute('data-category') === state.category;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
        }

        function render() {
            syncFilterButtons();

            var query = state.query.toLowerCase();
            var filtered = posts.filter(function (post) {
                if (state.category !== 'all' && post.category !== state.category) {
                    return false;
                }

                if (!query) return true;

                var haystack = [
                    post.title,
                    post.title_en,
                    post.summary,
                    post.summary_en,
                    post.category,
                    post.id
                ].join(' ').toLowerCase();

                return haystack.indexOf(query) !== -1;
            });

            if (resultCount) {
                resultCount.textContent = filtered.length + (filtered.length === 1 ? ' note' : ' notes');
            }

            if (resultLabel) {
                resultLabel.textContent = state.category === 'all'
                    ? 'All notes'
                    : formatCategory(state.category);
            }

            if (!filtered.length) {
                list.innerHTML = '<div class="empty-state">' +
                    '<p class="kicker">Nothing under that heading</p>' +
                    '<h2>Try a wider search.</h2>' +
                    '<p>No notes matched. Clear the search or choose another category.</p>' +
                    '<button class="arrow-link" type="button" data-reset-filters>Reset filters <span aria-hidden="true">↻</span></button>' +
                '</div>';
                return;
            }

            list.innerHTML = filtered.map(entryTemplate).join('');
            initReveals(list);
        }

        if (search) {
            search.addEventListener('input', debounce(function () {
                state.query = search.value.trim();
                render();
                syncUrl();
            }, 110));
        }

        if (filters) {
            filters.addEventListener('click', function (event) {
                var button = event.target.closest('.filter-btn');
                if (!button || !filters.contains(button)) return;
                state.category = button.getAttribute('data-category') || 'all';
                render();
                syncUrl();
            });
        }

        list.addEventListener('click', function (event) {
            if (!event.target.closest('[data-reset-filters]')) return;
            state.category = 'all';
            state.query = '';
            if (search) search.value = '';
            render();
            syncUrl();
            if (search) search.focus();
        });

        fetchPosts().then(function (data) {
            posts = data.posts.slice().sort(byDateDesc);

            var counts = Object.create(null);
            posts.forEach(function (post) {
                var key = post.category || 'note';
                counts[key] = (counts[key] || 0) + 1;
            });

            categories = Object.keys(counts).sort(function (a, b) {
                return counts[b] - counts[a] || a.localeCompare(b);
            });

            var params = new URLSearchParams(window.location.search);
            var requestedCategory = params.get('category') || 'all';
            state.query = params.get('q') || '';
            state.category = requestedCategory === 'all' || categories.indexOf(requestedCategory) !== -1
                ? requestedCategory
                : 'all';

            if (search) search.value = state.query;

            if (filters) {
                var html = '<button class="filter-btn" data-category="all" type="button">' +
                    '<span>All notes</span><span class="filter-count">' + posts.length + '</span>' +
                '</button>';

                categories.forEach(function (category) {
                    html += '<button class="filter-btn" data-category="' + escapeHtml(category) + '" type="button">' +
                        '<span>' + escapeHtml(formatCategory(category)) + '</span>' +
                        '<span class="filter-count">' + counts[category] + '</span>' +
                    '</button>';
                });

                filters.innerHTML = html;
            }

            if (archiveCount) {
                archiveCount.textContent = String(posts.length).padStart(2, '0') +
                    (posts.length === 1 ? ' note' : ' notes');
            }

            render();
        }).catch(function (error) {
            if (resultCount) resultCount.textContent = 'Unavailable';
            if (resultLabel) resultLabel.textContent = 'Connection issue';
            list.innerHTML = '<div class="empty-state">' +
                '<p class="kicker">The archive did not load</p>' +
                '<h2>Off the grid, temporarily.</h2>' +
                '<p>Check that the site is being served over HTTP and try again.</p>' +
                '<a class="arrow-link" href="index.html">Back home <span aria-hidden="true">↗</span></a>' +
            '</div>';
            if (window.console && console.warn) console.warn('Notes archive:', error);
        });
    }

    /* ----------------------------------------------------------------------
       Markdown helpers
       ---------------------------------------------------------------------- */
    function getAttribute(tag, name) {
        var expression = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
        var match = expression.exec(tag);
        if (!match) return '';
        if (match[1] !== undefined) return match[1];
        if (match[2] !== undefined) return match[2];
        return match[3] || '';
    }

    function resolveAssetUrl(url) {
        var value = String(url || '').trim();
        if (!value) return '';
        if (/^(?:https?:|data:|\/)/i.test(value)) return value;
        value = value.replace(/^\.\//, '');
        value = value.replace(/^(?:\.\.\/)+assets\//, 'assets/');
        return value;
    }

    function safeUrl(url) {
        var value = String(url || '').trim();
        if (/^(?:javascript|data|vbscript):/i.test(value)) return '#';
        return value;
    }

    function imageFigure(source, alt) {
        var resolved = resolveAssetUrl(source);
        if (!resolved || /^(?:javascript|vbscript):/i.test(resolved)) return '';
        var safeAlt = escapeHtml(alt || '');
        var caption = '';
        if (alt && !/^image-\d{6,}/i.test(alt) && !/\.(?:png|jpe?g|gif|webp|svg)$/i.test(alt)) {
            caption = '<figcaption>' + safeAlt + '</figcaption>';
        }

        return '<figure class="md-image">' +
            '<a href="' + escapeHtml(resolved) + '" target="_blank" rel="noopener">' +
                '<img src="' + escapeHtml(resolved) + '" alt="' + safeAlt + '" loading="lazy" decoding="async">' +
            '</a>' +
            caption +
        '</figure>';
    }

    function slugify(value) {
        var plain = String(value || '')
            .replace(/`([^`]*)`/g, '$1')
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/&[a-zA-Z0-9#]+;/g, '')
            .replace(/[*_~]/g, '')
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-+|-+$/g, '');

        return plain || 'section';
    }

    function uniqueSlug(value, counts) {
        var base = slugify(value);
        var id = base;
        var number = 2;

        while (counts[id]) {
            id = base + '-' + number;
            number += 1;
        }

        counts[id] = true;
        return id;
    }

    function isTableSeparator(line) {
        return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
    }

    function splitTableRow(row) {
        var value = row.trim();
        if (value.charAt(0) === '|') value = value.slice(1);
        if (value.charAt(value.length - 1) === '|') value = value.slice(0, -1);
        return value.split('|').map(function (cell) {
            return cell.trim();
        });
    }

    function renderTable(lines) {
        var header = splitTableRow(lines[0]);
        var rows = lines.slice(2).map(splitTableRow);
        var html = '<div class="table-wrap"><table><thead><tr>';

        header.forEach(function (cell) {
            html += '<th>' + renderInline(cell) + '</th>';
        });

        html += '</tr></thead><tbody>';

        rows.forEach(function (row) {
            html += '<tr>';
            for (var index = 0; index < header.length; index += 1) {
                html += '<td>' + renderInline(row[index] || '') + '</td>';
            }
            html += '</tr>';
        });

        return html + '</tbody></table></div>';
    }

    function renderInline(value) {
        var output = escapeHtml(value);

        output = output.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, url) {
            var href = safeUrl(url);
            var external = /^https?:\/\//i.test(href);
            return '<a href="' + href + '"' +
                (external ? ' target="_blank" rel="noopener"' : '') +
                '>' + label + '</a>';
        });

        output = output.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
        output = output.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
        output = output.replace(/~~([^~]+?)~~/g, '<del>$1</del>');

        return output;
    }

    function renderListLevel(items, start, indent) {
        var ordered = items[start].ordered;
        var html = ordered ? '<ol>' : '<ul>';
        var index = start;

        while (index < items.length) {
            var item = items[index];
            if (item.indent < indent) break;
            if (item.indent > indent) break;
            if (item.ordered !== ordered) break;

            var content = renderInline(item.text);
            index += 1;

            if (index < items.length && items[index].indent > indent) {
                var nested = renderListLevel(items, index, items[index].indent);
                content += nested.html;
                index = nested.next;
            }

            html += '<li>' + content + '</li>';
        }

        html += ordered ? '</ol>' : '</ul>';
        return { html: html, next: index };
    }

    function renderList(items) {
        var cursor = 0;
        var html = '';

        while (cursor < items.length) {
            var level = renderListLevel(items, cursor, items[cursor].indent);
            html += level.html;
            cursor = level.next;
        }

        return html;
    }

    function parseMarkdown(markdown) {
        var md = String(markdown == null ? '' : markdown).replace(/\r\n?/g, '\n');

        // The page renders the title from posts.json, so drop the duplicate H1.
        md = md.replace(/^\s*#\s+[^\n]*\n?/, '');
        md = md.replace(/^\s*>\s*(?:发布日期|Published)[^\n]*\n?/i, '');

        var stash = [];

        function token(html) {
            stash.push(html);
            return '\u0000' + (stash.length - 1) + '\u0000';
        }

        function block(html) {
            return '\n\n' + token(html) + '\n\n';
        }

        function restore(html) {
            return html.replace(/\u0000(\d+)\u0000/g, function (match, index) {
                return stash[Number(index)] || '';
            });
        }

        // 1. Fenced code and Mermaid diagrams.
        md = md.replace(/```([^\n`]*)\n([\s\S]*?)```/g, function (match, info, code) {
            var language = String(info || 'text').trim().split(/\s+/)[0];
            language = language.replace(/[^\w+#.-]/g, '') || 'text';
            var clean = code.replace(/\n$/, '');

            if (language.toLowerCase() === 'mermaid') {
                return block('<div class="mermaid">' + escapeHtml(clean) + '</div>');
            }

            return block(
                '<figure class="code-block">' +
                    '<figcaption class="code-block__head">' +
                        '<span>' + escapeHtml(language || 'text') + '</span>' +
                        '<button class="copy-btn" type="button" data-copy>Copy</button>' +
                    '</figcaption>' +
                    '<pre class="language-' + language + '"><code class="language-' + language + '">' +
                        escapeHtml(clean) +
                    '</code></pre>' +
                '</figure>'
            );
        });

        // 2. Inline code (before math so dollar signs inside code are safe).
        md = md.replace(/`([^`\n]+)`/g, function (match, code) {
            return token('<code>' + escapeHtml(code) + '</code>');
        });

        // 3. Display math.
        md = md.replace(/\$\$([\s\S]*?)\$\$/g, function (match, formula) {
            return block('<div class="math-block">\\[' + escapeHtml(formula.trim()) + '\\]</div>');
        });

        // 4. Inline math. Keep ordinary dollar amounts as text.
        md = md.replace(/\$([^\n$]+?)\$/g, function (match, formula) {
            if (/^\s|\s$/.test(formula)) return match;
            if (!/[\\a-zA-Z0-9_^{}]/.test(formula)) return match;
            return token('<span class="math-inline">\\(' + escapeHtml(formula) + '\\)</span>');
        });

        // 5. Raw images and rules, including the screenshot paths in the notes.
        md = md.replace(/<img\b[^>]*>/gi, function (tag) {
            var source = getAttribute(tag, 'src');
            if (!source) return '';
            return block(imageFigure(source, getAttribute(tag, 'alt')));
        });
        md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

        // 6. Markdown images.
        md = md.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g, function (match, alt, source) {
            return block(imageFigure(source, alt));
        });

        // Preserve raw line breaks without splitting table rows.
        md = md.replace(/<br\s*\/?>/gi, function () {
            return token('<br>');
        });

        var lines = md.split('\n');
        var output = [];
        var slugCounts = Object.create(null);
        var cursor = 0;

        function isBlockTokenLine(value) {
            return /^\u0000\d+\u0000$/.test(value.trim());
        }

        while (cursor < lines.length) {
            var line = lines[cursor];
            var trimmed = line.trim();

            if (!trimmed) {
                cursor += 1;
                continue;
            }

            if (isBlockTokenLine(trimmed)) {
                output.push(trimmed);
                cursor += 1;
                continue;
            }

            var heading = /^(#{1,6})\s+(.*)$/.exec(line);
            if (heading) {
                var level = heading[1].length;
                var headingText = heading[2].trim();
                var headingId = uniqueSlug(headingText, slugCounts);
                output.push(
                    '<h' + level + ' id="' + escapeHtml(headingId) + '">' +
                        renderInline(headingText) +
                        '<a class="heading-anchor" href="#' + escapeHtml(headingId) + '" aria-label="Link to this section">#</a>' +
                    '</h' + level + '>'
                );
                cursor += 1;
                continue;
            }

            if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
                output.push('<hr>');
                cursor += 1;
                continue;
            }

            if (trimmed.indexOf('|') !== -1 && cursor + 1 < lines.length && isTableSeparator(lines[cursor + 1])) {
                var table = [line, lines[cursor + 1]];
                cursor += 2;
                while (cursor < lines.length && lines[cursor].trim() && lines[cursor].indexOf('|') !== -1) {
                    table.push(lines[cursor]);
                    cursor += 1;
                }
                output.push(renderTable(table));
                continue;
            }

            if (/^>\s?/.test(trimmed)) {
                var quote = [];
                while (cursor < lines.length && /^>\s?/.test(lines[cursor].trim())) {
                    quote.push(lines[cursor].trim().replace(/^>\s?/, ''));
                    cursor += 1;
                }
                output.push('<blockquote>' + quote.map(function (item) {
                    return '<p>' + renderInline(item) + '</p>';
                }).join('') + '</blockquote>');
                continue;
            }

            if (/^(\s*)([-*+]|\d+\.)\s+/.test(line)) {
                var listItems = [];
                while (cursor < lines.length) {
                    var listMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[cursor]);
                    if (!listMatch) break;
                    listItems.push({
                        indent: listMatch[1].replace(/\t/g, '    ').length,
                        ordered: /^\d+\.$/.test(listMatch[2]),
                        text: listMatch[3]
                    });
                    cursor += 1;
                }
                output.push(renderList(listItems));
                continue;
            }

            var paragraph = [];
            while (cursor < lines.length) {
                var current = lines[cursor];
                var currentTrimmed = current.trim();

                if (!currentTrimmed) break;
                if (isBlockTokenLine(currentTrimmed)) break;
                if (/^(#{1,6})\s+/.test(current)) break;
                if (/^>\s?/.test(currentTrimmed)) break;
                if (/^(\s*)([-*+]|\d+\.)\s+/.test(current)) break;
                if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(currentTrimmed)) break;
                if (currentTrimmed.indexOf('|') !== -1 && cursor + 1 < lines.length && isTableSeparator(lines[cursor + 1])) break;

                paragraph.push(currentTrimmed);
                cursor += 1;
            }

            if (paragraph.length) {
                output.push('<p>' + paragraph.map(renderInline).join('<br>') + '</p>');
            }
        }

        return restore(output.join('\n'));
    }

    /* ----------------------------------------------------------------------
       Single note page
       ---------------------------------------------------------------------- */
    function estimateReading(text) {
        var cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
        var latin = text.replace(/[\u3400-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(cjk / 400 + latin / 220));
    }

    function isMostlyChinese(text) {
        var cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
        var visible = text.replace(/\s/g, '').length || 1;
        return cjk / visible > 0.12;
    }

    function typesetMath(node) {
        function run() {
            if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                window.MathJax.typesetPromise([node]).catch(function (error) {
                    if (window.console && console.warn) console.warn('MathJax:', error);
                });
            }
        }

        if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
            window.MathJax.startup.promise.then(run);
            return;
        }

        var attempts = 0;
        var timer = window.setInterval(function () {
            attempts += 1;
            if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                window.clearInterval(timer);
                run();
            } else if (attempts > 40) {
                window.clearInterval(timer);
            }
        }, 250);
    }

    var mermaidCount = 0;

    function renderMermaid(scope) {
        if (!window.mermaid) return;

        var nodes = $$('.mermaid', scope || document).filter(function (node) {
            return node.getAttribute('data-rendered') !== 'true';
        });
        if (!nodes.length) return;

        var dark = currentTheme() === 'dark';

        try {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                securityLevel: 'strict',
                themeVariables: {
                    darkMode: dark,
                    background: dark ? '#16120e' : '#f2ecdf',
                    primaryColor: dark ? '#2a231c' : '#e7decd',
                    primaryTextColor: dark ? '#f0e8da' : '#171411',
                    primaryBorderColor: dark ? '#e06a45' : '#b54327',
                    lineColor: dark ? '#c7bca9' : '#4a4339',
                    secondaryColor: dark ? '#3a3027' : '#ded2be',
                    tertiaryColor: dark ? '#211c16' : '#f8f3e9',
                    fontFamily: 'Instrument Sans, sans-serif',
                    fontSize: '14px'
                }
            });
        } catch (error) {
            if (window.console && console.warn) console.warn('Mermaid init:', error);
            return;
        }

        nodes.forEach(function (node) {
            var source = node.getAttribute('data-src') || node.textContent || '';
            node.setAttribute('data-src', source);
            var id = 'mermaid-diagram-' + mermaidCount;
            mermaidCount += 1;

            try {
                window.mermaid.render(id, source).then(function (result) {
                    node.innerHTML = result.svg;
                    node.setAttribute('data-rendered', 'true');
                }).catch(function (error) {
                    if (window.console && console.warn) console.warn('Mermaid render:', error);
                    node.innerHTML = '<pre class="mermaid-error">Diagram could not be rendered.</pre>';
                    node.setAttribute('data-rendered', 'true');
                });
            } catch (error) {
                if (window.console && console.warn) console.warn('Mermaid render:', error);
                node.innerHTML = '<pre class="mermaid-error">Diagram could not be rendered.</pre>';
                node.setAttribute('data-rendered', 'true');
            }
        });
    }

    window.__jlRerenderMermaid = function () {
        var nodes = $$('.mermaid[data-src]');
        if (!nodes.length) return;

        nodes.forEach(function (node) {
            node.removeAttribute('data-rendered');
            node.textContent = node.getAttribute('data-src') || '';
        });

        renderMermaid(document);
    };

    function buildToc(content) {
        var toc = $('#toc');
        if (!toc) return;

        var panel = $('#tocPanel');
        var headings = $$('h2, h3, h4', content);

        if (!headings.length) {
            toc.innerHTML = '<p class="toc__empty">No sections in this note.</p>';
            if (panel) panel.open = false;
            return;
        }

        var items = headings.map(function (heading) {
            var clone = heading.cloneNode(true);
            var anchor = clone.querySelector('.heading-anchor');
            if (anchor) anchor.parentNode.removeChild(anchor);
            var label = (clone.textContent || '').trim();
            var level = heading.tagName.charAt(1);

            return '<li class="toc__item toc__item--h' + level + '">' +
                '<a href="#' + escapeHtml(heading.id) + '">' + escapeHtml(label) + '</a>' +
            '</li>';
        });

        toc.innerHTML = '<ol>' + items.join('') + '</ol>';

        if (panel) {
            if (window.matchMedia && window.matchMedia('(max-width: 980px)').matches) {
                panel.open = false;
            }

            if (window.matchMedia) {
                var desktop = window.matchMedia('(min-width: 981px)');
                var openOnDesktop = function () {
                    if (desktop.matches) panel.open = true;
                };

                if (desktop.addEventListener) {
                    desktop.addEventListener('change', openOnDesktop);
                } else if (desktop.addListener) {
                    desktop.addListener(openOnDesktop);
                }
            }
        }

        if ('IntersectionObserver' in window) {
            var links = {};
            $$('a', toc).forEach(function (link) {
                var href = link.getAttribute('href') || '';
                if (href.charAt(0) === '#') links[href.slice(1)] = link;
            });

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    $$('a', toc).forEach(function (link) {
                        link.classList.remove('is-active');
                        link.removeAttribute('aria-current');
                    });
                    var active = links[entry.target.id];
                    if (active) {
                        active.classList.add('is-active');
                        active.setAttribute('aria-current', 'true');
                    }
                });
            }, {
                rootMargin: '-12% 0px -76% 0px',
                threshold: 0
            });

            headings.forEach(function (heading) {
                observer.observe(heading);
            });
        }
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        var copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (error) {
            copied = false;
        }

        document.body.removeChild(textarea);
        return copied;
    }

    function addCopyButtons(content) {
        $$('.copy-btn', content).forEach(function (button) {
            if (button.getAttribute('data-bound') === 'true') return;
            button.setAttribute('data-bound', 'true');

            button.addEventListener('click', function () {
                var block = button.closest('.code-block');
                var code = block ? block.querySelector('code') : null;
                var text = code ? code.textContent : '';
                var original = button.textContent;

                function showCopied() {
                    button.textContent = 'Copied';
                    window.setTimeout(function () {
                        button.textContent = original;
                    }, 1600);
                }

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(showCopied).catch(function () {
                        button.textContent = fallbackCopy(text) ? 'Copied' : 'Copy failed';
                        window.setTimeout(function () {
                            button.textContent = original;
                        }, 1600);
                    });
                } else {
                    button.textContent = fallbackCopy(text) ? 'Copied' : 'Copy failed';
                    window.setTimeout(function () {
                        button.textContent = original;
                    }, 1600);
                }
            });
        });
    }

    function scrollToHash() {
        if (!window.location.hash) return;

        var id = window.location.hash.slice(1);
        try {
            id = decodeURIComponent(id);
        } catch (error) { /* keep the raw hash */ }

        var target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ block: 'start' });
        }
    }

    function initProgress(content) {
        var bar = $('#progressBar');
        if (!bar || !content) return;

        var ticking = false;

        function update() {
            ticking = false;
            var rect = content.getBoundingClientRect();
            var start = window.scrollY + rect.top;
            var distance = rect.height - window.innerHeight * 0.45;
            var progress = (window.scrollY - start + window.innerHeight * 0.25) / Math.max(distance, 1);
            progress = Math.max(0, Math.min(1, progress));
            bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
    }

    function initPager(post, posts) {
        var pager = $('#postPager');
        if (!pager) return;

        var chronological = posts.slice().sort(byDateAsc);
        var index = chronological.findIndex(function (item) {
            return item.id === post.id;
        });

        var previous = index > 0 ? chronological[index - 1] : null;
        var next = index >= 0 && index < chronological.length - 1 ? chronological[index + 1] : null;

        if (!previous && !next) {
            pager.hidden = true;
            return;
        }

        var html = '';
        html += previous
            ? '<a class="pager__item pager__item--prev" href="post.html?id=' + escapeHtml(encodeURIComponent(previous.id)) + '">' +
                '<span>Previous note</span><strong>' + escapeHtml(previous.title) + '</strong>' +
            '</a>'
            : '<span></span>';

        html += next
            ? '<a class="pager__item pager__item--next" href="post.html?id=' + escapeHtml(encodeURIComponent(next.id)) + '">' +
                '<span>Next note</span><strong>' + escapeHtml(next.title) + '</strong>' +
            '</a>'
            : '<span></span>';

        pager.innerHTML = html;
    }

    function showPostError(message) {
        document.title = 'Note not found — Justin Liu';

        var title = $('#postTitle');
        if (title) title.textContent = 'Note not found';

        var kicker = $('#postKicker');
        if (kicker) kicker.textContent = 'Notes — 404';

        var summary = $('#postSummary');
        if (summary) summary.textContent = '';

        var alt = $('#postAltTitle');
        if (alt) alt.textContent = '';

        var date = $('#postDate');
        if (date) {
            date.textContent = '—';
            date.removeAttribute('datetime');
        }

        var reading = $('#postReading');
        if (reading) reading.textContent = '—';

        var language = $('#postLanguage');
        if (language) language.textContent = '—';

        var aside = $('.article-aside');
        if (aside) aside.hidden = true;

        var layout = $('.article-layout');
        if (layout) layout.classList.add('article-layout--error');

        var pager = $('#postPager');
        if (pager) pager.hidden = true;

        var content = $('#postContent');
        if (content) {
            content.lang = 'en';
            content.innerHTML = '<div class="note-error">' +
                '<p class="kicker">404 / Notes</p>' +
                '<h2>This note is not here.</h2>' +
                '<p>' + escapeHtml(message) + '</p>' +
                '<a class="arrow-link" href="blog.html">Back to the notes <span aria-hidden="true">↗</span></a>' +
            '</div>';
        }
    }

    function postProcess(content) {
        buildToc(content);
        addCopyButtons(content);

        if (window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
            try {
                window.Prism.highlightAllUnder(content);
            } catch (error) {
                if (window.console && console.warn) console.warn('Prism:', error);
            }
        }

        renderMermaid(content);
        typesetMath(content);
    }

    function initPost() {
        var content = $('#postContent');
        if (!content) return;

        var params = new URLSearchParams(window.location.search);
        var postId = params.get('id');

        if (!postId) {
            showPostError('No note was selected. Pick one from the notes index.');
            return;
        }

        fetchPosts().then(function (data) {
            var posts = data.posts.slice().sort(byDateDesc);
            var post = posts.find(function (item) {
                return item.id === postId;
            });

            if (!post) {
                showPostError('That note is no longer in the index.');
                return;
            }

            var title = post.title || 'Untitled note';
            document.title = title + ' — Justin Liu';

            var titleElement = $('#postTitle');
            if (titleElement) {
                titleElement.textContent = title;
                titleElement.lang = /[㐀-鿿]/.test(title) ? 'zh-CN' : 'en';
            }

            var kicker = $('#postKicker');
            if (kicker) kicker.textContent = 'Notes — ' + formatCategory(post.category);

            var alt = $('#postAltTitle');
            if (alt) {
                alt.textContent = post.title_en && post.title_en !== title ? post.title_en : '';
            }

            var summary = $('#postSummary');
            if (summary) {
                var summaryText = post.summary || post.summary_en || '';
                summary.textContent = summaryText;
                summary.lang = /[㐀-鿿]/.test(summaryText) ? 'zh-CN' : 'en';
            }

            var date = $('#postDate');
            if (date) {
                date.textContent = formatDate(post.date, true);
                date.setAttribute('datetime', post.date || '');
            }

            var category = $('#postCategory');
            if (category) category.textContent = formatCategory(post.category);

            var metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', post.summary || post.summary_en || title);
            }

            return fetch('posts/' + encodeURIComponent(post.file), { cache: 'no-cache' })
                .then(function (response) {
                    if (!response.ok) throw new Error('Note responded with ' + response.status);
                    return response.text();
                })
                .then(function (markdown) {
                    var chinese = isMostlyChinese(markdown);

                    var language = $('#postLanguage');
                    if (language) language.textContent = chinese ? '中文' : 'English';

                    var reading = $('#postReading');
                    if (reading) reading.textContent = estimateReading(markdown) + ' min read';

                    content.lang = chinese ? 'zh-CN' : 'en';
                    content.innerHTML = parseMarkdown(markdown);

                    postProcess(content);
                    initProgress(content);
                    initPager(post, posts);
                    scrollToHash();
                });
        }).catch(function (error) {
            showPostError('This note could not be loaded right now. Check the connection and try again.');
            if (window.console && console.warn) console.warn('Note:', error);
        });
    }

    /* ----------------------------------------------------------------------
       Personal data — Now & Life
       Both pages are edited through the JSON files in /data, not the HTML.
       ---------------------------------------------------------------------- */
    var dataCache = Object.create(null);

    function fetchData(path) {
        if (!dataCache[path]) {
            dataCache[path] = fetch(path, { cache: 'no-cache' })
                .then(function (response) {
                    if (!response.ok) throw new Error(path + ' responded with ' + response.status);
                    return response.json();
                })
                .then(function (data) {
                    if (!data || typeof data !== 'object') {
                        throw new Error(path + ' is not a JSON object');
                    }
                    return data;
                });
        }

        return dataCache[path];
    }

    function dateStamp(value) {
        var date = parseDate(value);
        if (!date) return { label: value || '', stamp: value || '' };

        try {
            var label = new Intl.DateTimeFormat('en-GB', {
                month: 'long',
                year: 'numeric'
            }).format(date);
            var short = new Intl.DateTimeFormat('en-GB', {
                month: 'short',
                year: 'numeric'
            }).format(date).split(' ');

            return {
                label: label,
                stamp: short[0] + '<br>' + short[1]
            };
        } catch (error) {
            return { label: value, stamp: value };
        }
    }

    function initHomeNow() {
        var list = $('#homeNow');
        if (!list) return;

        fetchData('data/now.json').then(function (data) {
            var rows = Array.isArray(data.home) ? data.home : [];
            if (!rows.length) throw new Error('data/now.json has no home snapshot');

            var stamp = dateStamp(data.updated);
            if (stamp.label) {
                $$('[data-now-updated]').forEach(function (element) {
                    element.textContent = stamp.label;
                });
            }

            list.innerHTML = rows.map(function (row) {
                return '<div class="now-list__row">' +
                    '<dt>' + escapeHtml(row.label) + '</dt>' +
                    '<dd>' + escapeHtml(row.text) + '</dd>' +
                '</div>';
            }).join('');

            list.hidden = false;
            var loading = $('[data-now-loading]');
            if (loading) loading.hidden = true;
        }).catch(function (error) {
            var loading = $('[data-now-loading]');
            if (loading) {
                loading.innerHTML = 'The snapshot did not load. <a href="now.html">Open /now</a>.';
            }
            if (window.console && console.warn) console.warn('Now snapshot:', error);
        });
    }

    function initNowPage() {
        var body = $('#nowSections');
        if (!body) return;

        fetchData('data/now.json').then(function (data) {
            var stamp = dateStamp(data.updated);

            if (stamp.label) {
                $$('[data-now-updated]').forEach(function (element) {
                    element.textContent = stamp.label;
                });
            }

            if (stamp.stamp) {
                $$('[data-now-stamp]').forEach(function (element) {
                    element.innerHTML = stamp.stamp;
                });
            }

            var intro = $('#nowIntro');
            if (intro && data.intro) intro.textContent = data.intro;

            var sections = Array.isArray(data.sections) ? data.sections : [];
            if (!sections.length) {
                body.innerHTML = '<p class="loading-line">No snapshot sections yet. Add them in <code>data/now.json</code>.</p>';
            } else {
                body.innerHTML = sections.map(function (section, index) {
                    var note = section.note
                        ? '<p class="now-block__note">' + escapeHtml(section.note) + '</p>'
                        : '';

                    return '<section class="now-block reveal">' +
                        '<span class="now-block__num" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span>' +
                        '<div>' +
                            '<h2>' + escapeHtml(section.title) + '</h2>' +
                            '<p>' + escapeHtml(section.body) + '</p>' +
                            note +
                        '</div>' +
                    '</section>';
                }).join('');

                initReveals(body);
            }

            var recent = $('#nowRecent');
            if (!recent) return;

            var entries = Array.isArray(data.recent) ? data.recent : [];
            if (!entries.length) {
                recent.innerHTML = '<li class="loading-line">Nothing logged yet.</li>';
                return;
            }

            recent.innerHTML = entries.map(function (entry) {
                var href = safeUrl(entry.href);
                var title = href
                    ? '<a href="' + escapeHtml(href) + '">' + escapeHtml(entry.title) + '</a>'
                    : escapeHtml(entry.title);
                var external = /^https?:/i.test(href);
                if (external) {
                    title = '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(entry.title) + ' <span aria-hidden="true">↗</span></a>';
                }
                var date = parseDate(entry.date);
                var time = date
                    ? '<time datetime="' + escapeHtml(entry.date) + '">' + escapeHtml(formatDate(entry.date, true)) + '</time>'
                    : '';
                var titleLang = /[㐀-鿿]/.test(entry.title || '') ? ' lang="zh-CN"' : '';

                return '<li class="now-recent__item reveal">' +
                    '<div class="now-recent__meta">' +
                        time +
                        '<span>' + escapeHtml(entry.kind || 'Entry') + '</span>' +
                    '</div>' +
                    '<div class="now-recent__body">' +
                        '<h3' + titleLang + '>' + title + '</h3>' +
                        (entry.text ? '<p>' + escapeHtml(entry.text) + '</p>' : '') +
                    '</div>' +
                '</li>';
            }).join('');

            initReveals(recent);
        }).catch(function (error) {
            body.innerHTML = '<div class="empty-state">' +
                '<p class="kicker">The snapshot did not load</p>' +
                '<h2>Off the grid, temporarily.</h2>' +
                '<p>Check that the site is being served over HTTP, then reload.</p>' +
            '</div>';
            var recentFallback = $('#nowRecent');
            if (recentFallback) {
                recentFallback.innerHTML = '<li class="loading-line">Unavailable.</li>';
            }
            if (window.console && console.warn) console.warn('Now page:', error);
        });
    }

    function initLifeLog() {
        var container = $('#lifeLog');
        if (!container) return;

        fetchData('data/life.json').then(function (data) {
            var stamp = dateStamp(data.updated);

            if (stamp.label) {
                $$('[data-life-updated]').forEach(function (element) {
                    element.textContent = stamp.label;
                });
            }

            var entries = Array.isArray(data.log) ? data.log : [];
            if (!entries.length) {
                container.innerHTML = '<div class="empty-state">' +
                    '<p class="kicker">The log is empty</p>' +
                    '<h2>Nothing worth keeping. Yet.</h2>' +
                    '<p>Short entries will appear here when there is something to write down.</p>' +
                '</div>';
                return;
            }

            container.innerHTML = entries.map(function (entry) {
                var meta = '';
                if (entry.date) {
                    meta += '<time datetime="' + escapeHtml(entry.date) + '">' + escapeHtml(formatDate(entry.date, true)) + '</time>';
                }
                if (entry.status) {
                    meta += '<span>' + escapeHtml(entry.status) + '</span>';
                }

                return '<article class="log-entry reveal">' +
                    '<div class="log-entry__meta">' +
                        meta +
                        '<span class="log-entry__tag">' + escapeHtml(entry.tag || 'Note') + '</span>' +
                    '</div>' +
                    '<div class="log-entry__body">' +
                        '<h2>' + escapeHtml(entry.title) + '</h2>' +
                        '<p>' + escapeHtml(entry.body) + '</p>' +
                    '</div>' +
                '</article>';
            }).join('');

            initReveals(container);
        }).catch(function (error) {
            container.innerHTML = '<div class="empty-state">' +
                '<p class="kicker">The log did not load</p>' +
                '<h2>Off the grid, temporarily.</h2>' +
                '<p>Check that the site is being served over HTTP, then reload.</p>' +
            '</div>';
            if (window.console && console.warn) console.warn('Life log:', error);
        });
    }

    /* ----------------------------------------------------------------------
       CV
       ---------------------------------------------------------------------- */
    function initCV() {
        var tabs = $$('.cv-tab');
        var panels = $$('.cv-lang');
        if (!tabs.length || !panels.length) return;

        function activate(language, focusTab) {
            tabs.forEach(function (tab) {
                var selected = tab.getAttribute('data-cv-lang') === language;
                tab.setAttribute('aria-selected', String(selected));
                tab.setAttribute('tabindex', selected ? '0' : '-1');
                if (selected && focusTab) tab.focus();
            });

            panels.forEach(function (panel) {
                panel.hidden = panel.getAttribute('data-cv-lang') !== language;
            });

            try {
                localStorage.setItem('cv-lang', language);
            } catch (error) { /* storage can be unavailable */ }
        }

        tabs.forEach(function (tab) {
            tab.setAttribute('tabindex', tab.getAttribute('aria-selected') === 'true' ? '0' : '-1');

            tab.addEventListener('click', function () {
                activate(tab.getAttribute('data-cv-lang'));
            });

            tab.addEventListener('keydown', function (event) {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();

                var index = tabs.indexOf(tab);
                var offset = event.key === 'ArrowRight' ? 1 : tabs.length - 1;
                var next = tabs[(index + offset) % tabs.length];
                activate(next.getAttribute('data-cv-lang'), true);
            });
        });

        var stored = null;
        try {
            stored = localStorage.getItem('cv-lang');
        } catch (error) { /* storage can be unavailable */ }

        if (stored === 'en' || stored === 'zh') {
            activate(stored);
        }

        var printButton = $('#printCv');
        if (printButton) {
            printButton.addEventListener('click', function () {
                window.print();
            });
        }
    }

    /* ----------------------------------------------------------------------
       Boot
       ---------------------------------------------------------------------- */
    function init() {
        initTheme();
        initClock();
        initYear();
        initNavigation();
        initReveals();
        initFeatured();
        initBlog();
        initPost();
        initHomeNow();
        initNowPage();
        initLifeLog();
        initCV();
        window.__jlReady = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
