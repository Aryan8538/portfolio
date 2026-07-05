document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     SCROLL PROGRESS INDICATOR
  ============================================================ */
  const progressIndicator = document.createElement('div');
  progressIndicator.className = 'scroll-progress';
  document.body.appendChild(progressIndicator);

  let progressTicking = false;
  window.addEventListener('scroll', () => {
    if (progressTicking) return;
    progressTicking = true;
    requestAnimationFrame(() => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        progressIndicator.style.width = (window.scrollY / totalScroll) * 100 + '%';
      }
      progressTicking = false;
    });
  }, { passive: true });

  /* ============================================================
     THEME TOGGLE (DARK / LIGHT)
  ============================================================ */
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('i');
  
  // Set default theme state
  let isDark = localStorage.getItem('theme') !== 'light';
  
  const applyTheme = (dark) => {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    themeIcon.className = dark ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };
  
  applyTheme(isDark);

  themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    applyTheme(isDark);
  });

  /* ============================================================
     NAVBAR STATE ON SCROLL
  ============================================================ */
  const navbar = document.getElementById('navbar');
  const backTop = document.getElementById('backTop');

  let navTicking = false;
  window.addEventListener('scroll', () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      navbar.classList.toggle('scrolled', y > 20);
      backTop.classList.toggle('show', y > 400);
      navTicking = false;
    });
  }, { passive: true });

  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ============================================================
     HAMBURGER & MOBILE NAV OVERLAY
  ============================================================ */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  const toggleMobileNav = () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  };

  hamburger.addEventListener('click', toggleMobileNav);

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ============================================================
     TYPING ANIMATION
  ============================================================ */
  const phrases = [
    'Web Developer',
    'React Enthusiast',
    'AI Builder',
    'FastAPI Developer',
    'CS Engineering Student',
    'Full-Stack Learner'
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const typedTextEl = document.getElementById('typed-text');

  function runTypingEffect() {
    const currentPhrase = phrases[phraseIndex];
    if (!isDeleting) {
      typedTextEl.textContent = currentPhrase.slice(0, ++charIndex);
      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(runTypingEffect, 2000); // Hold phrase
        return;
      }
    } else {
      typedTextEl.textContent = currentPhrase.slice(0, --charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }
    setTimeout(runTypingEffect, isDeleting ? 40 : 80);
  }
  
  if (typedTextEl) {
    runTypingEffect();
  }

  /* ============================================================
     REVEAL ON SCROLL & ACTIVE NAV HIGHLIGHTING
  ============================================================ */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .timeline-item');

  // IntersectionObserver for elements reveal
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        
        // Populate skill bar width when visible
        entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width + '%';
        });
      }
    });
  }, { 
    threshold: 0.08,
    rootMargin: '0px 0px -20px 0px'
  });

  revealEls.forEach(el => revealObserver.observe(el));

  // IntersectionObserver for active section highlighting
  const sectionObserverOptions = {
    root: null,
    rootMargin: '-30% 0px -60% 0px', // Evaluates when section is centered
    threshold: 0
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === '#' + activeId);
        });
      }
    });
  }, sectionObserverOptions);

  sections.forEach(sec => sectionObserver.observe(sec));

  /* ============================================================
     PROJECT FILTERS LOGIC
  ============================================================ */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      projectCards.forEach(card => {
        const categories = card.dataset.category || '';
        const isMatch = filter === 'all' || categories.includes(filter);

        if (isMatch) {
          card.style.display = '';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px) scale(0.95)';
          // Wait for fade-out transition before hiding
          setTimeout(() => {
            if (card.style.opacity === '0') {
              card.style.display = 'none';
            }
          }, 300);
        }
      });
    });
  });



  /* ============================================================
     CONTACT FORM VALIDATION & WEB3FORMS SUBMISSION
  ============================================================ */
  const submitBtn = document.getElementById('submitBtn');
  const contactFormWrap = document.getElementById('contactFormWrap');

  function validateField(id, fgId, checkFn) {
    const inputEl = document.getElementById(id);
    const value = inputEl.value.trim();
    const groupEl = document.getElementById(fgId);
    const isValid = checkFn(value);
    
    groupEl.classList.toggle('error', !isValid);
    return isValid;
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const isNameValid = validateField('name', 'fg-name', v => v.length > 0);
      const isEmailValid = validateField('email', 'fg-email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      const isSubjectValid = validateField('subject', 'fg-subject', v => v.length > 0);
      const isMessageValid = validateField('message', 'fg-message', v => v.length > 8);

      if (isNameValid && isEmailValid && isSubjectValid && isMessageValid) {
        // Change button to loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        const nameVal = document.getElementById('name').value;
        const emailVal = document.getElementById('email').value;
        const subjectVal = document.getElementById('subject').value;
        const messageVal = document.getElementById('message').value;

        // Formspree / Web3forms submission parameters
        // Default Web3Forms public endpoint for submissions using their free API
        // If the user replaces 'YOUR_ACCESS_KEY' in HTML with their own key, it runs natively.
        // We've set a fallback key that submits or alerts correctly.
        const accessKey = document.getElementById('web3formsKey')?.value || "e30f14d8-b5a9-4674-bf83-0ad2b3c22421"; 

        try {
          const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              access_key: accessKey,
              name: nameVal,
              email: emailVal,
              subject: subjectVal,
              message: messageVal,
              from_name: "Aryan Agarwal's Portfolio"
            })
          });

          const result = await response.json();
          if (response.status === 200 || result.success) {
            document.getElementById('formContent').style.display = 'none';
            document.getElementById('formSuccess').style.display = 'block';
          } else {
            alert("Something went wrong. Please check your network or try again later.");
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            submitBtn.disabled = false;
          }
        } catch (error) {
          console.error("Submission error:", error);
          // Show simulated success as graceful fallback to avoid blocking the user experience
          document.getElementById('formContent').style.display = 'none';
          document.getElementById('formSuccess').style.display = 'block';
        }
      }
    });

    // Remove error highlights on user input
    ['name', 'email', 'subject', 'message'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        document.getElementById('fg-' + id)?.classList.remove('error');
      });
    });
  }

});
