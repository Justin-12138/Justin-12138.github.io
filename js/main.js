/**
 * Justin Liu's Personal Website
 * Main JavaScript File
 */

// ============================================
// Internationalization (i18n)
// ============================================
const translations = {
    zh: {
        'nav.home': '首页',
        'nav.blog': '博客',
        'nav.cv': '简历',
        'hero.greeting': '你好，我是',
        'hero.title': '算法工程师 / AI 研究者',
        'hero.description': '专注于大语言模型推理优化、多智能体系统与因果推断研究。热爱探索 AI 前沿技术，致力于将复杂的算法转化为实际应用。',
        'hero.viewCV': '查看简历',
        'hero.readBlog': '阅读博客',
        'skills.title': '技术栈',
        'skills.llm': 'LLM 推理',
        'skills.llmDesc': 'vLLM, SGLang, LMDeploy, TensorRT-LLM',
        'skills.ml': '机器学习',
        'skills.mlDesc': 'PyTorch, Transformers, DeepSpeed',
        'skills.mas': '多智能体',
        'skills.masDesc': 'LangGraph, AutoGen, Google ADK',
        'skills.data': '数据分析',
        'skills.dataDesc': 'Python, R, 因果推断',
        'projects.title': '精选项目',
        'projects.research': '研究',
        'projects.work': '工作',
        'projects.ci.title': '因果推断在阿尔兹海默症生物标志物的挖掘',
        'projects.ci.desc': '基于因果推断的特征选择方法，用于识别阿尔兹海默症生物标志物。论文已发表于 ICAI 2024。',
        'projects.rag.title': '基于文章树的 RAG 精度调优',
        'projects.rag.desc': '创新性地将文章解构成树结构，实现基于文章树的检索，相比传统 RAG 方案能更高效准确地召回相关内容。',
        'projects.paper': '论文',
        'projects.internal': '内部项目',
        'contact.title': '联系我',
        'footer.rights': '保留所有权利',
        'footer.tech': '使用 HTML, CSS & JavaScript 构建',
        // Blog page
        'blog.title': '博客',
        'blog.subtitle': '分享技术见解与学习心得',
        'blog.empty.title': '暂无文章',
        'blog.empty.desc': '博客文章正在准备中，敬请期待...',
        'blog.back': '← 返回博客列表',
        'blog.filter.all': '全部',
        'blog.filter.tech': '技术',
        'blog.filter.life': '生活',
        // CV page
        'cv.title': '个人简历',
        'cv.subtitle': '我的教育背景与工作经历',
        'cv.tab.zh': '中文',
        'cv.tab.en': 'English',
        'cv.education': '教育经历',
        'cv.work': '工作经历',
        'cv.projects': '项目经历',
        'cv.skills': '技能',
        'cv.other': '其他',
        'cv.download': '下载 PDF'
    },
    en: {
        'nav.home': 'Home',
        'nav.blog': 'Blog',
        'nav.cv': 'CV',
        'hero.greeting': 'Hi, I\'m',
        'hero.title': 'AI Engineer / Researcher',
        'hero.description': 'Focused on LLM inference optimization, multi-agent systems, and causal inference research. Passionate about exploring cutting-edge AI technologies and turning complex algorithms into practical applications.',
        'hero.viewCV': 'View CV',
        'hero.readBlog': 'Read Blog',
        'skills.title': 'Tech Stack',
        'skills.llm': 'LLM Inference',
        'skills.llmDesc': 'vLLM, SGLang, LMDeploy, TensorRT-LLM',
        'skills.ml': 'Machine Learning',
        'skills.mlDesc': 'PyTorch, Transformers, DeepSpeed',
        'skills.mas': 'Multi-Agent',
        'skills.masDesc': 'LangGraph, AutoGen, Google ADK',
        'skills.data': 'Data Analysis',
        'skills.dataDesc': 'Python, R, Causal Inference',
        'projects.title': 'Featured Projects',
        'projects.research': 'Research',
        'projects.work': 'Work',
        'projects.ci.title': 'Causal Inference for Alzheimer\'s Disease Biomarker Discovery',
        'projects.ci.desc': 'A causal inference-based feature selection method for identifying Alzheimer\'s disease biomarkers. Published at ICAI 2024.',
        'projects.rag.title': 'Article Tree-based RAG Optimization',
        'projects.rag.desc': 'Innovatively deconstructs articles into tree structures for retrieval, achieving more efficient and accurate content recall compared to traditional RAG solutions.',
        'projects.paper': 'Paper',
        'projects.internal': 'Internal Project',
        'contact.title': 'Contact Me',
        'footer.rights': 'All rights reserved',
        'footer.tech': 'Built with HTML, CSS & JavaScript',
        // Blog page
        'blog.title': 'Blog',
        'blog.subtitle': 'Sharing technical insights and learning experiences',
        'blog.empty.title': 'No Posts Yet',
        'blog.empty.desc': 'Blog posts are coming soon, stay tuned...',
        'blog.back': '← Back to Blog',
        'blog.filter.all': 'All',
        'blog.filter.tech': 'Tech',
        'blog.filter.life': 'Life',
        // CV page
        'cv.title': 'Curriculum Vitae',
        'cv.subtitle': 'My education and work experience',
        'cv.tab.zh': '中文',
        'cv.tab.en': 'English',
        'cv.education': 'Education',
        'cv.work': 'Work Experience',
        'cv.projects': 'Projects',
        'cv.skills': 'Skills',
        'cv.other': 'Other',
        'cv.download': 'Download PDF'
    }
};

// Current language
let currentLang = localStorage.getItem('lang') || 'zh';

// Current blog filter
let currentFilter = 'all';

// Blog data cache
let blogData = null;

// Initialize i18n
function initI18n() {
    updateLanguage(currentLang);
    updateLangToggle();
}

// Update all translatable elements
function updateLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
    
    updateLangToggle();
}

// Update language toggle button appearance
function updateLangToggle() {
    const langToggle = document.getElementById('langToggle');
    if (!langToggle) return;
    
    const zhSpan = langToggle.querySelector('.lang-zh');
    const enSpan = langToggle.querySelector('.lang-en');
    
    if (currentLang === 'zh') {
        zhSpan.classList.add('active');
        enSpan.classList.remove('active');
    } else {
        zhSpan.classList.remove('active');
        enSpan.classList.add('active');
    }
}

// Toggle language
function toggleLanguage() {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    updateLanguage(newLang);
    
    // Reload blog posts if on blog page
    if (document.querySelector('.blog-list')) {
        renderBlogPosts();
    }
}

// ============================================
// Theme Toggle (Light/Dark Mode)
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to light mode, unless user saved dark or system prefers dark
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// ============================================
// Navigation
// ============================================
function initNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
    
    // Language toggle
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
}

// ============================================
// CV Page Tabs
// ============================================
function initCVTabs() {
    const tabs = document.querySelectorAll('.cv-tab');
    const contents = document.querySelectorAll('.cv-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetLang = tab.getAttribute('data-lang');
            
            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update content
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.getAttribute('data-lang') === targetLang) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// ============================================
// Blog System - Load posts from JSON
// ============================================
async function loadBlogPosts() {
    const blogList = document.querySelector('.blog-list');
    if (!blogList) return;
    
    try {
        const response = await fetch('posts/posts.json');
        blogData = await response.json();
        
        // Initialize filters
        initBlogFilters();
        
        // Render posts
        renderBlogPosts();
        
    } catch (error) {
        console.error('Error loading blog posts:', error);
        showEmptyBlog(blogList);
    }
}

function initBlogFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update filter and render
            currentFilter = btn.getAttribute('data-filter');
            renderBlogPosts();
        });
    });
}

function renderBlogPosts() {
    const blogList = document.querySelector('.blog-list');
    if (!blogList || !blogData) return;
    
    // Filter posts
    let filteredPosts = blogData.posts;
    if (currentFilter !== 'all') {
        filteredPosts = blogData.posts.filter(post => post.group === currentFilter);
    }
    
    if (filteredPosts && filteredPosts.length > 0) {
        blogList.innerHTML = filteredPosts.map(post => {
            const title = currentLang === 'zh' ? post.title : (post.title_en || post.title);
            const summary = currentLang === 'zh' ? post.summary : (post.summary_en || post.summary);
            const groupInfo = blogData.categories[post.group];
            const groupIcon = groupInfo ? groupInfo.icon : '📄';
            
            return `
                <article class="blog-card" data-group="${post.group}" onclick="window.location.href='post.html?id=${post.id}'">
                    <div class="blog-meta">
                        <span class="blog-group">${groupIcon}</span>
                        <span class="blog-category">${post.category}</span>
                        <span class="blog-date">${post.date}</span>
                    </div>
                    <h3>${title}</h3>
                    <p>${summary}</p>
                </article>
            `;
        }).join('');
    } else {
        const emptyTitle = currentLang === 'zh' ? '该分类暂无文章' : 'No posts in this category';
        const emptyDesc = currentLang === 'zh' ? '试试其他分类吧' : 'Try another category';
        
        blogList.innerHTML = `
            <div class="blog-empty">
                <div class="blog-empty-icon">📭</div>
                <h3>${emptyTitle}</h3>
                <p>${emptyDesc}</p>
            </div>
        `;
    }
}

function showEmptyBlog(container) {
    const emptyTitle = currentLang === 'zh' ? '暂无文章' : 'No Posts Yet';
    const emptyDesc = currentLang === 'zh' ? '博客文章正在准备中，敬请期待...' : 'Blog posts are coming soon, stay tuned...';
    
    container.innerHTML = `
        <div class="blog-empty">
            <div class="blog-empty-icon">📝</div>
            <h3>${emptyTitle}</h3>
            <p>${emptyDesc}</p>
        </div>
    `;
}

// ============================================
// Blog Post - Load single post
// ============================================
async function loadBlogPost() {
    const postContent = document.querySelector('.post-content');
    const postTitle = document.querySelector('.post-title');
    const postMeta = document.querySelector('.post-meta');
    
    if (!postContent) return;
    
    // Get post ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        window.location.href = 'blog.html';
        return;
    }
    
    try {
        // Load posts.json to get post info
        const postsResponse = await fetch('posts/posts.json');
        const postsData = await postsResponse.json();
        const post = postsData.posts.find(p => p.id === postId);
        
        if (!post) {
            window.location.href = 'blog.html';
            return;
        }
        
        // Update title and meta
        const title = currentLang === 'zh' ? post.title : (post.title_en || post.title);
        postTitle.textContent = title;
        document.title = `${title} | Justin Liu`;
        
        const groupInfo = postsData.categories[post.group];
        const groupIcon = groupInfo ? groupInfo.icon : '📄';
        
        postMeta.innerHTML = `
            <span class="blog-group">${groupIcon}</span>
            <span class="blog-category">${post.category}</span>
            <span>${post.date}</span>
        `;
        
        // Load markdown content
        const mdResponse = await fetch(`posts/${post.file}`);
        const mdContent = await mdResponse.text();
        
        // Parse markdown to HTML
        postContent.innerHTML = parseMarkdown(mdContent);
        
        // Syntax highlighting for code blocks
        highlightCode();
        
        // Trigger MathJax to render math formulas if available
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([postContent]).catch(err => {
                console.warn('MathJax rendering error:', err);
            });
        }
        
    } catch (error) {
        console.error('Error loading blog post:', error);
        postContent.innerHTML = '<p>Error loading post content.</p>';
    }
}

// ============================================
// Simple Markdown Parser
// ============================================
function parseMarkdown(md) {
    // Remove the first H1 (title) as we display it separately
    md = md.replace(/^# .+\n/, '');
    
    // Remove blockquote with date/category (we show it in meta)
    md = md.replace(/^> 发布日期：.+\n\n?/m, '');
    
    // Placeholder storage for protected content
    const placeholders = [];
    let placeholderIndex = 0;
    
    function addPlaceholder(html) {
        const placeholder = `__PLACEHOLDER_${placeholderIndex}__`;
        placeholders.push({ placeholder, html });
        placeholderIndex++;
        return placeholder;
    }
    
    // Protect HTML tags (like <img>) first
    md = md.replace(/<(img|br|hr)[^>]*\/?>/gi, (match) => {
        return addPlaceholder(match);
    });
    
    // Protect block math formulas ($$...$$)
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        return '\n\n' + addPlaceholder(`<div class="math-block">\\[${formula.trim()}\\]</div>`) + '\n\n';
    });
    
    // Protect inline math formulas ($...$)
    md = md.replace(/\$([^\$\n]+)\$/g, (match, formula) => {
        return addPlaceholder(`<span class="math-inline">\\(${formula}\\)</span>`);
    });
    
    // Protect code blocks (special handling for mermaid)
    md = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        if (lang === 'mermaid') {
            // Mermaid diagrams - use special class for later rendering
            return '\n\n' + addPlaceholder(`<div class="mermaid">${escapeHtml(code.trim())}</div>`) + '\n\n';
        }
        // Regular code blocks - use Prism.js classes
        return '\n\n' + addPlaceholder(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`) + '\n\n';
    });
    
    // Protect inline code
    md = md.replace(/`([^`]+)`/g, (match, code) => {
        return addPlaceholder(`<code>${escapeHtml(code)}</code>`);
    });
    
    // Process tables - find table blocks and convert them
    md = md.replace(/(\|.+\|[\r\n]+)+/g, (tableBlock) => {
        const lines = tableBlock.trim().split('\n').filter(line => line.trim());
        if (lines.length < 2) return tableBlock;
        
        // Check if second line is separator (contains only |, -, :, spaces)
        const isSeparator = (line) => /^\|[\s\-:|]+\|$/.test(line.trim());
        
        let html = '<div class="table-wrapper"><table>';
        let headerProcessed = false;
        
        lines.forEach((line, index) => {
            // Skip separator lines
            if (isSeparator(line)) {
                headerProcessed = true;
                return;
            }
            
            // Extract cells
            const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
            
            if (index === 0 && lines.length > 1 && isSeparator(lines[1])) {
                // This is a header row
                html += '<thead><tr>';
                cells.forEach(cell => {
                    html += `<th>${cell}</th>`;
                });
                html += '</tr></thead><tbody>';
            } else {
                // This is a data row
                if (!headerProcessed && index === 0) {
                    html += '<tbody>';
                }
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
                html += '</tr>';
            }
        });
        
        html += '</tbody></table></div>';
        // 添加换行符确保后续内容在行首，可以被正确解析
        return '\n\n' + addPlaceholder(html) + '\n\n';
    });
    
    // Process images ![alt](url)
    md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
        return '\n\n' + addPlaceholder(`<figure class="md-image"><img src="${url}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`) + '\n\n';
    });
    
    let html = md
        // Headers (only match at start of line, order matters: longest first)
        .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        // Blockquotes
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr>')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Paragraphs
        .replace(/\n\n+/g, '</p><p>')
        // Line breaks (but not multiple)
        .replace(/\n/g, '<br>');
    
    // Restore all placeholders
    placeholders.forEach(item => {
        html = html.replace(item.placeholder, item.html);
    });
    
    // Wrap in paragraph
    html = '<p>' + html + '</p>';
    
    // Fix list items - wrap consecutive li elements in ul
    html = html.replace(/(<li>.*?<\/li>(<br>)?)+/gs, match => {
        const cleaned = match.replace(/<br>/g, '');
        return `<ul>${cleaned}</ul>`;
    });
    
    // Clean up empty paragraphs and fix structure
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br><\/p>/g, '');
    html = html.replace(/<p>(\s|<br>)*<(h[1-5]|ul|ol|pre|blockquote|hr|div|table|figure)/g, '<$2');
    html = html.replace(/<\/(h[1-5]|ul|ol|pre|blockquote|div|table|figure)>(\s|<br>)*<\/p>/g, '</$1>');
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<br><\/p>/g, '</p>');
    html = html.replace(/<br><br>/g, '<br>');
    
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightCode() {
    // Use Prism.js for syntax highlighting if available
    if (window.Prism) {
        Prism.highlightAll();
    }
    
    // Render Mermaid diagrams if available
    if (window.mermaid) {
        // Update mermaid theme based on current theme
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        mermaid.initialize({ 
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default'
        });
        
        // Find all mermaid divs and render them
        document.querySelectorAll('.mermaid').forEach((el, index) => {
            const code = el.textContent;
            const id = `mermaid-${index}`;
            try {
                mermaid.render(id, code).then(({ svg }) => {
                    el.innerHTML = svg;
                }).catch(err => {
                    console.warn('Mermaid rendering error:', err);
                    el.innerHTML = `<pre class="mermaid-error">Mermaid Error: ${err.message}</pre>`;
                });
            } catch (err) {
                console.warn('Mermaid error:', err);
            }
        });
    }
}

// ============================================
// Scroll Animations
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe skill cards and project cards
    document.querySelectorAll('.skill-card, .project-card, .blog-card, .cv-item').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// Typing Effect
// ============================================
function initTypingEffect() {
    const codeContent = document.querySelector('.code-content code');
    if (!codeContent) return;
    
    codeContent.style.opacity = '0';
    setTimeout(() => {
        codeContent.style.transition = 'opacity 0.5s ease';
        codeContent.style.opacity = '1';
    }, 500);
}

// ============================================
// Smooth Scroll for Anchor Links
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// Initialize Everything
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initI18n();
    initNavigation();
    initCVTabs();
    initScrollAnimations();
    initTypingEffect();
    initSmoothScroll();
    
    // Load blog posts if on blog page
    if (document.querySelector('.blog-list')) {
        loadBlogPosts();
    }
    
    // Load single post if on post page
    if (document.querySelector('.post-content')) {
        loadBlogPost();
    }
    
    console.log('%c👋 Welcome to Justin Liu\'s Website!', 'color: #0891b2; font-size: 16px; font-weight: bold;');
    console.log('%c🚀 Built with HTML, CSS & JavaScript', 'color: #7c3aed; font-size: 12px;');
});

// ============================================
// Utility Functions
// ============================================

// Format date
function formatDate(dateString, lang = 'zh') {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', options);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
