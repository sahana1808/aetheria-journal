/**
 * Aetheria Journal Client Application
 */

class AetheriaApp {
  constructor() {
    this.entries = [];
    this.activeView = "dashboard";
    this.currentEditingId = null;
    this.editorTags = [];
    this.currentCalendarDate = new Date();
    this.selectedCalendarDate = null;
    this.userName = "Journaler";
    this.selectedTheme = "dark";

    // Supabase variables
    this.supabase = null;
    this.supabaseUser = null;

    // SVG colors mapped to mood ratings for analytics charting
    this.moodColors = {
      5: "#10b981", // Rad
      4: "#3b82f6", // Good
      3: "#f59e0b", // Meh
      2: "#f97316", // Awful
      1: "#ef4444"  // Terrible
    };

    this.init();
  }

  init() {
    this.loadFromLocalStorage();
    this.applyTheme(this.selectedTheme);
    this.setupEventListeners();
    
    // Connect to Supabase remote database if configs exist
    this.initSupabase();

    this.navigateTo("dashboard");
    
    // Set default date picker in editor to today's date local time
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("entry-date").value = todayStr;
    
    // Initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- STATE & STORAGE MANAGEMENT ---

  loadFromLocalStorage() {
    const storedEntries = localStorage.getItem("aetheria_entries");
    let hasLoadedData = false;
    
    if (storedEntries) {
      try {
        this.entries = JSON.parse(storedEntries);
        if (this.entries && this.entries.length > 0) {
          hasLoadedData = true;
        }
      } catch (e) {
        console.error("Failed to parse stored entries", e);
        this.entries = [];
      }
    }

    // Seed mock demo entries if empty to showcase charts and features immediately
    if (!hasLoadedData) {
      const getPastDateString = (daysAgo) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      this.entries = [
        {
          id: "entry_demo_1",
          title: "Productive Focus Day & Tidy Space",
          date: getPastDateString(0), // Today
          mood: 4, // Good
          content: "Woke up early today feeling refreshed. Spent the morning cleaning up my workspace, organising my notes, and setting up my new journal project.\n\n### Today's Milestones\n- Clear desk, clear mind! Sorted my physical paperwork.\n- Completed 3 modules of training tutorials.\n- Cooked a healthy meal (vegetable stir-fry).\n\nFeeling happy with the steady progress. Looking forward to tomorrow.",
          tags: ["productivity", "health", "mindset"],
          image: null
        },
        {
          id: "entry_demo_2",
          title: "Late Night Coding Breakthrough!",
          date: getPastDateString(1), // Yesterday
          mood: 5, // Rad
          content: "Finally squashed that stubborn memory leak bug! Had been tracking it down for days, and it turned out to be an active event listener that wasn't being cleaned up on component unmount. Celebrated with pizza and a late night walk.\n\n> The best code is code that works smoothly and doesn't leak memories.\n\nFeeling super accomplished and relieved.",
          tags: ["coding", "achievement", "victory"],
          image: null
        },
        {
          id: "entry_demo_3",
          title: "Slow Morning, Restful Afternoon",
          date: getPastDateString(2), // 2 Days Ago
          mood: 3, // Meh
          content: "Had trouble sleeping last night, so woke up feeling pretty sluggish today. Decided not to push myself too hard. Had a quiet afternoon reading at the local cafe and watching the rain.\n\n- Finished the sci-fi novel\n- Listened to some soft lo-fi beats\n\nSometimes rest is productive in its own way.",
          tags: ["reading", "rest", "coffee"],
          image: null
        },
        {
          id: "entry_demo_4",
          title: "Long Forest Walk & Photography",
          date: getPastDateString(3), // 3 Days Ago
          mood: 5, // Rad
          content: "Spent the day out in the nature reserve. The autumn foliage is beginning to show, and the light filtering through the canopy was breathtaking. Shot several photos on my camera. Met a friendly husky along the trail.\n\n- Walked 12,000 steps\n- Saw a deer crossing the stream\n- Disconnected completely from work chat\n\nNature never fails to restore my focus.",
          tags: ["nature", "walk", "peaceful"],
          image: null
        },
        {
          id: "entry_demo_5",
          title: "Busy Workday and Tight Deadlines",
          date: getPastDateString(4), // 4 Days Ago
          mood: 2, // Awful
          content: "Meetings ran back-to-back all day. Felt overwhelmed trying to finalize the design reports before the client review. Barely had time for lunch. Need to establish better boundaries for scheduling.\n\n- Left work feeling completely drained\n- Drank way too much coffee\n\nNeed to sleep early tonight and reset.",
          tags: ["work", "stress", "meetings"],
          image: null
        }
      ];
      this.saveToLocalStorage();
    }

    const storedName = localStorage.getItem("aetheria_username");
    if (storedName) {
      this.userName = storedName;
    }
    document.getElementById("settings-username").value = this.userName;
    this.updateUserGreeting();

    const storedTheme = localStorage.getItem("aetheria_theme");
    if (storedTheme) {
      this.selectedTheme = storedTheme;
    }
    
    // Update active theme selector in Settings UI
    document.querySelectorAll(".theme-choice").forEach(btn => {
      if (btn.getAttribute("data-theme-val") === this.selectedTheme) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  saveToLocalStorage() {
    localStorage.setItem("aetheria_entries", JSON.stringify(this.entries));
    localStorage.setItem("aetheria_username", this.userName);
    localStorage.setItem("aetheria_theme", this.selectedTheme);
  }

  updateUserGreeting() {
    const greetingElem = document.getElementById("dashboard-welcome");
    const sidebarNameElem = document.getElementById("user-greeting-name");
    
    if (sidebarNameElem) {
      sidebarNameElem.textContent = this.userName;
    }

    if (greetingElem) {
      const hr = new Date().getHours();
      let greeting = "Good day";
      if (hr < 12) greeting = "Good morning";
      else if (hr < 17) greeting = "Good afternoon";
      else greeting = "Good evening";

      greetingElem.textContent = `${greeting}, ${this.userName}`;
    }
  }

  applyTheme(themeName) {
    document.documentElement.setAttribute("data-theme", themeName);
    this.selectedTheme = themeName;
    this.saveToLocalStorage();
  }

  // --- ROUTING / VIEW NAVIGATION ---

  navigateTo(viewId) {
    this.activeView = viewId;
    
    // Toggle active section elements
    document.querySelectorAll(".view-section").forEach(sec => {
      sec.classList.remove("active");
    });
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    // Toggle active navigation button status
    document.querySelectorAll(".nav-btn").forEach(btn => {
      if (btn.getAttribute("data-target") === viewId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Close mobile side drawer overlay if open
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-nav-overlay");
    if (sidebar && overlay) {
      sidebar.classList.remove("mobile-open");
      overlay.classList.remove("active");
    }

    // Perform specific view rendering
    if (viewId === "dashboard") {
      this.renderDashboard();
    } else if (viewId === "calendar") {
      this.renderCalendar();
    } else if (viewId === "analytics") {
      this.renderAnalytics();
    } else if (viewId === "editor" && !this.currentEditingId) {
      this.resetEditor();
    }

    // Smooth scroll to top of view
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- REGISTER EVENT LISTENERS ---

  setupEventListeners() {
    // Sidebar nav link clicks
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        this.currentEditingId = null; // Exit editor edit-mode if switching manually
        this.navigateTo(target);
      });
    });

    // Mobile navigation toggle buttons
    const menuBtn = document.getElementById("menu-toggle-btn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-nav-overlay");

    if (menuBtn && sidebar && overlay) {
      menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
        overlay.classList.toggle("active");
      });

      overlay.addEventListener("click", () => {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("active");
      });
    }

    // Settings Profile Name update
    const saveUserBtn = document.getElementById("save-username-btn");
    if (saveUserBtn) {
      saveUserBtn.addEventListener("click", () => {
        const inputName = document.getElementById("settings-username").value.trim();
        if (inputName) {
          this.userName = inputName;
          this.saveToLocalStorage();
          this.updateUserGreeting();
          alert("Profile updated successfully!");
        }
      });
    }

    // Settings Theme selector buttons
    document.querySelectorAll(".theme-choice").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-theme-val");
        this.applyTheme(val);
        document.querySelectorAll(".theme-choice").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Editor Mood Selector button clicks
    const moodSelectorContainer = document.getElementById("mood-selector-container");
    if (moodSelectorContainer) {
      moodSelectorContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".mood-btn");
        if (btn) {
          document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        }
      });
    }

    // Editor Tag Creator listeners
    const tagInput = document.getElementById("tag-input");
    const addTagBtn = document.getElementById("add-tag-btn");
    
    if (tagInput && addTagBtn) {
      const handleTagAddition = () => {
        const tagText = tagInput.value.trim().toLowerCase().replace(/,/g, "");
        if (tagText && !this.editorTags.includes(tagText)) {
          this.editorTags.push(tagText);
          this.renderEditorTags();
          tagInput.value = "";
        }
      };

      tagInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          handleTagAddition();
        }
      });

      addTagBtn.addEventListener("click", handleTagAddition);
    }

    // Image Upload triggers
    const uploaderArea = document.getElementById("image-uploader-area");
    const fileInput = document.getElementById("image-file-input");
    const removeImgBtn = document.getElementById("remove-img-btn");

    if (uploaderArea && fileInput) {
      uploaderArea.addEventListener("click", (e) => {
        // Prevent file click trigger if clicking the remove button
        if (e.target.closest("#remove-img-btn")) return;
        fileInput.click();
      });

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            alert("File size exceeds 2MB limit. Please upload a smaller image to preserve local storage.");
            fileInput.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            this.setEditorImage(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeImgBtn) {
      removeImgBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setEditorImage(null);
        fileInput.value = "";
      });
    }

    // Save Journal Entry button listener
    const saveEntryBtn = document.getElementById("save-entry-btn");
    if (saveEntryBtn) {
      saveEntryBtn.addEventListener("click", () => this.saveEntry());
    }

    // Timeline Filter controls (Search & Selects)
    const searchInput = document.getElementById("search-input");
    const filterMood = document.getElementById("filter-mood");
    const filterTag = document.getElementById("filter-tag");

    if (searchInput) searchInput.addEventListener("input", () => this.renderDashboardList());
    if (filterMood) filterMood.addEventListener("change", () => this.renderDashboardList());
    if (filterTag) filterTag.addEventListener("change", () => this.renderDashboardList());

    // Calendar Navigation clicks
    const calPrev = document.getElementById("cal-prev-month");
    const calNext = document.getElementById("cal-next-month");
    const calToday = document.getElementById("cal-today-btn");

    if (calPrev) {
      calPrev.addEventListener("click", () => {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
        this.renderCalendar();
      });
    }
    if (calNext) {
      calNext.addEventListener("click", () => {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
        this.renderCalendar();
      });
    }
    if (calToday) {
      calToday.addEventListener("click", () => {
        this.currentCalendarDate = new Date();
        this.selectedCalendarDate = new Date().toISOString().split('T')[0];
        this.renderCalendar();
      });
    }

    // Modal close overlay and button
    const modalClose = document.getElementById("modal-close-btn");
    const modalOverlay = document.getElementById("entry-details-modal");
    if (modalClose && modalOverlay) {
      modalClose.addEventListener("click", () => {
        modalOverlay.classList.remove("active");
      });
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove("active");
        }
      });
    }

    // Modal Action buttons
    const modalDelete = document.getElementById("modal-delete-btn");
    const modalEdit = document.getElementById("modal-edit-btn");
    if (modalDelete && modalEdit) {
      modalDelete.addEventListener("click", () => {
        const entryId = modalDelete.getAttribute("data-entry-id");
        if (entryId) {
          this.deleteEntry(entryId);
          modalOverlay.classList.remove("active");
        }
      });
      modalEdit.addEventListener("click", () => {
        const entryId = modalEdit.getAttribute("data-entry-id");
        if (entryId) {
          this.loadEntryForEditing(entryId);
          modalOverlay.classList.remove("active");
        }
      });
    }

    // Import database buttons
    const triggerImportBtn = document.getElementById("trigger-import-btn");
    const importInput = document.getElementById("import-json-input");
    if (triggerImportBtn && importInput) {
      triggerImportBtn.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", (e) => this.handleJSONImport(e));
    }

    // Database Wiping button
    const wipeBtn = document.getElementById("wipe-data-btn");
    if (wipeBtn) {
      wipeBtn.addEventListener("click", () => this.wipeDatabase());
    }

    // --- SUPABASE SETUP LISTENERS ---
    const saveSupaConfigBtn = document.getElementById("save-supabase-config-btn");
    if (saveSupaConfigBtn) {
      saveSupaConfigBtn.addEventListener("click", () => this.handleSupabaseSaveCredentials());
    }

    const clearSupaConfigBtn = document.getElementById("clear-supabase-config-btn");
    if (clearSupaConfigBtn) {
      clearSupaConfigBtn.addEventListener("click", () => this.handleSupabaseDisconnectCloud());
    }

    const btnCloudSignIn = document.getElementById("btn-cloud-signin");
    if (btnCloudSignIn) {
      btnCloudSignIn.addEventListener("click", () => this.handleCloudSignIn());
    }

    const btnCloudSignUp = document.getElementById("btn-cloud-signup");
    if (btnCloudSignUp) {
      btnCloudSignUp.addEventListener("click", () => this.handleCloudSignUp());
    }

    const btnCloudSignOut = document.getElementById("btn-cloud-signout");
    if (btnCloudSignOut) {
      btnCloudSignOut.addEventListener("click", () => this.handleCloudSignOut());
    }

    const btnCloudSyncNow = document.getElementById("btn-cloud-sync-now");
    if (btnCloudSyncNow) {
      btnCloudSyncNow.addEventListener("click", () => this.syncCloudEntries());
    }
  }

  // --- EDITOR FUNCTIONALITY ---

  resetEditor() {
    this.currentEditingId = null;
    this.editorTags = [];
    document.getElementById("editor-title-heading").textContent = "Capture the Moment";
    document.getElementById("entry-title").value = "";
    document.getElementById("entry-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("entry-content").value = "";
    
    // Default select "Good" mood button
    document.querySelectorAll(".mood-btn").forEach(btn => {
      if (btn.getAttribute("data-mood") === "4") btn.classList.add("active");
      else btn.classList.remove("active");
    });
    
    // Clear tag UI
    this.renderEditorTags();
    
    // Reset image preview
    this.setEditorImage(null);
    document.getElementById("image-file-input").value = "";

    // Reset preview mode to normal editing
    const textarea = document.getElementById("entry-content");
    const previewPanel = document.getElementById("entry-preview");
    const togglePreviewBtn = document.getElementById("toggle-preview-btn");
    if (textarea && previewPanel && togglePreviewBtn) {
      textarea.classList.remove("hidden");
      previewPanel.classList.add("hidden");
      togglePreviewBtn.classList.remove("active");
      togglePreviewBtn.querySelector(".btn-text").textContent = "Preview";
    }
  }

  loadEntryForEditing(entryId) {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return;

    this.currentEditingId = entryId;
    this.editorTags = [...(entry.tags || [])];

    document.getElementById("editor-title-heading").textContent = "Refine the Memory";
    document.getElementById("entry-title").value = entry.title || "";
    document.getElementById("entry-date").value = entry.date || "";
    document.getElementById("entry-content").value = entry.content || "";

    // Set mood
    document.querySelectorAll(".mood-btn").forEach(btn => {
      if (btn.getAttribute("data-mood") === String(entry.mood)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    this.renderEditorTags();
    this.setEditorImage(entry.image);
    this.navigateTo("editor");
  }

  setEditorImage(base64Data) {
    const prompt = document.getElementById("uploader-prompt");
    const previewContainer = document.getElementById("uploader-preview-container");
    const previewImg = document.getElementById("entry-img-preview");

    if (base64Data) {
      prompt.classList.add("hidden");
      previewContainer.classList.remove("hidden");
      previewImg.src = base64Data;
    } else {
      prompt.classList.remove("hidden");
      previewContainer.classList.add("hidden");
      previewImg.src = "";
    }
  }

  renderEditorTags() {
    const tagsList = document.getElementById("editor-tags-list");
    if (!tagsList) return;
    
    tagsList.innerHTML = "";
    this.editorTags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = `#${tag}`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "tag-chip-remove";
      removeBtn.innerHTML = "&times;";
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => {
        this.editorTags = this.editorTags.filter(t => t !== tag);
        this.renderEditorTags();
      });

      chip.appendChild(removeBtn);
      tagsList.appendChild(chip);
    });
  }

  insertMarkdown(prefix, suffix) {
    const textarea = document.getElementById("entry-content");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    
    // Reposition cursor
    const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }

  toggleEditorPreview() {
    const textarea = document.getElementById("entry-content");
    const previewPanel = document.getElementById("entry-preview");
    const toggleBtn = document.getElementById("toggle-preview-btn");
    if (!textarea || !previewPanel || !toggleBtn) return;

    const isPreviewHidden = previewPanel.classList.contains("hidden");

    if (isPreviewHidden) {
      // Switch to preview mode
      const markdownContent = textarea.value;
      previewPanel.innerHTML = this.parseMarkdown(markdownContent) || "<p style='color:var(--text-muted); font-style:italic;'>No content written yet.</p>";
      
      textarea.classList.add("hidden");
      previewPanel.classList.remove("hidden");
      toggleBtn.classList.add("active");
      toggleBtn.querySelector(".btn-text").textContent = "Edit Content";
    } else {
      // Switch to editing mode
      textarea.classList.remove("hidden");
      previewPanel.classList.add("hidden");
      toggleBtn.classList.remove("active");
      toggleBtn.querySelector(".btn-text").textContent = "Preview";
    }
  }

  saveEntry() {
    const titleVal = document.getElementById("entry-title").value.trim();
    const dateVal = document.getElementById("entry-date").value;
    const contentVal = document.getElementById("entry-content").value;
    
    const activeMoodBtn = document.querySelector(".mood-btn.active");
    const moodVal = activeMoodBtn ? parseInt(activeMoodBtn.getAttribute("data-mood")) : 4;

    if (!titleVal) {
      alert("Please provide a title for your journal entry.");
      return;
    }
    if (!dateVal) {
      alert("Please choose a date.");
      return;
    }

    const previewImg = document.getElementById("entry-img-preview");
    const imageVal = previewImg && previewImg.src && previewImg.src.startsWith("data:") ? previewImg.src : null;

    if (this.currentEditingId) {
      // Update existing entry
      const index = this.entries.findIndex(e => e.id === this.currentEditingId);
      if (index !== -1) {
        this.entries[index] = {
          ...this.entries[index],
          title: titleVal,
          date: dateVal,
          mood: moodVal,
          content: contentVal,
          tags: [...this.editorTags],
          image: imageVal
        };
      }
    } else {
      // Create new entry
      const newEntry = {
        id: "entry_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        title: titleVal,
        date: dateVal,
        mood: moodVal,
        content: contentVal,
        tags: [...this.editorTags],
        image: imageVal
      };
      this.entries.push(newEntry);
    }

    // Sort entries chronologically newest first
    this.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    this.saveToLocalStorage();

    // Cloud Sync update
    if (this.supabase && this.supabaseUser) {
      const entry = this.currentEditingId 
        ? this.entries.find(e => e.id === this.currentEditingId)
        : this.entries[0]; // Newly created is first because of sorting
      
      if (entry) {
        const row = {
          id: entry.id,
          user_id: this.supabaseUser.id,
          title: entry.title,
          date: entry.date,
          mood: entry.mood,
          content: entry.content,
          tags: entry.tags || [],
          image: entry.image || null
        };
        this.supabase.from('entries').upsert(row).then(({ error }) => {
          if (error) console.error("Cloud upsert failed", error);
        });
      }
    }

    this.resetEditor();
    this.navigateTo("dashboard");
  }

  cancelEdit() {
    if (confirm("Discard all unsaved edits?")) {
      this.resetEditor();
      this.navigateTo("dashboard");
    }
  }

  deleteEntry(id) {
    if (confirm("Are you sure you want to permanently delete this entry?")) {
      this.entries = this.entries.filter(e => e.id !== id);
      this.saveToLocalStorage();

      // Cloud delete
      if (this.supabase && this.supabaseUser) {
        this.supabase.from('entries').delete().eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud delete failed", error);
        });
      }

      this.renderDashboard();
      this.renderCalendar();
      this.renderAnalytics();
      alert("Entry deleted successfully.");
    }
  }

  // --- DASHBOARD TIMELINE & STATISTICS ---

  renderDashboard() {
    this.updateUserGreeting();
    
    // 1. Calculate and update stats
    const totalEntries = this.entries.length;
    document.getElementById("stats-total-entries").textContent = totalEntries;
    
    // Streaks
    const streak = this.calculateStreak();
    document.getElementById("stats-streak").textContent = `${streak} day${streak === 1 ? '' : 's'}`;

    // Dominant Mood
    const dominantMood = this.calculateDominantMood();
    document.getElementById("stats-dominant-mood").textContent = dominantMood;

    // Populate timeline tags filter selector dropdown
    this.populateTagFilter();

    // Render entries list
    this.renderDashboardList();
    
    // Today's date display
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("dashboard-date").textContent = new Date().toLocaleDateString('en-US', dateOptions);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderDashboardList() {
    const listContainer = document.getElementById("entries-list");
    const emptyState = document.getElementById("timeline-empty-state");
    if (!listContainer) return;

    // Remove older entries, keep empty state template reference
    const childBtns = listContainer.querySelectorAll(".entry-card");
    childBtns.forEach(el => el.remove());

    const searchQuery = document.getElementById("search-input").value.trim().toLowerCase();
    const filterMoodVal = document.getElementById("filter-mood").value;
    const filterTagVal = document.getElementById("filter-tag").value;

    // Filter logic
    const filtered = this.entries.filter(entry => {
      const matchSearch = !searchQuery || 
        (entry.title && entry.title.toLowerCase().includes(searchQuery)) ||
        (entry.content && entry.content.toLowerCase().includes(searchQuery)) ||
        (entry.tags && entry.tags.some(t => t.toLowerCase().includes(searchQuery)));
      
      const matchMood = !filterMoodVal || String(entry.mood) === filterMoodVal;
      
      const matchTag = !filterTagVal || (entry.tags && entry.tags.includes(filterTagVal));

      return matchSearch && matchMood && matchTag;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      // Change helper message depending on query filters active
      const isFiltering = searchQuery || filterMoodVal || filterTagVal;
      emptyState.querySelector("h3").textContent = isFiltering ? "No matching memories" : "Start your journey";
      emptyState.querySelector("p").textContent = isFiltering ? "Try adjusting your search keywords or mood filter filters." : "Write your first entry today. Capture your thoughts, feelings, and memories.";
      const actionBtn = emptyState.querySelector("button");
      if (isFiltering) actionBtn.classList.add("hidden");
      else actionBtn.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");

      filtered.forEach(entry => {
        const card = document.createElement("div");
        card.className = "entry-card glass-card";
        
        // Background cover image
        let imageHTML = "";
        if (entry.image) {
          imageHTML = `
            <div class="entry-card-image">
              <img src="${entry.image}" alt="Entry Cover">
            </div>
          `;
        } else {
          // If no image, generate a elegant abstract gradient cover to look highly premium
          const hue = (parseInt(entry.id.replace(/\D/g, "")) % 360) || 240;
          imageHTML = `
            <div class="entry-card-image" style="background: linear-gradient(135deg, hsl(${hue}, 60%, 25%), hsl(${(hue + 60) % 360}, 50%, 15%));">
            </div>
          `;
        }

        const moodLabels = { 5: "🔥 Rad", 4: "😊 Good", 3: "😐 Meh", 2: "😔 Awful", 1: "😢 Terrible" };
        const moodText = moodLabels[entry.mood] || "😐 Meh";

        // Date layout
        const dateObj = new Date(entry.date + "T00:00:00");
        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        // Strip HTML / Markdown tags for preview excerpt
        const plainExcerpt = this.stripMarkdownForExcerpt(entry.content);

        // Tags layout
        const tagsHTML = (entry.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join("");

        card.innerHTML = `
          ${imageHTML}
          <div class="mood-ribbon">${moodText}</div>
          <div class="entry-card-content">
            <div class="entry-card-meta">
              <span>${formattedDate}</span>
              <span>${this.countWords(entry.content)} words</span>
            </div>
            <h3 class="entry-card-title">${entry.title}</h3>
            <p class="entry-card-excerpt">${plainExcerpt || "No text written..."}</p>
            <div class="entry-card-tags">
              ${tagsHTML}
            </div>
            <div class="entry-card-footer">
              <button class="card-action-btn" title="Edit Entry" data-action="edit">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="card-action-btn delete-hover" title="Delete Entry" data-action="delete">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        `;

        // Card actions trigger
        card.addEventListener("click", (e) => {
          const actionBtn = e.target.closest(".card-action-btn");
          if (actionBtn) {
            const action = actionBtn.getAttribute("data-action");
            if (action === "edit") {
              e.stopPropagation();
              this.loadEntryForEditing(entry.id);
            } else if (action === "delete") {
              e.stopPropagation();
              this.deleteEntry(entry.id);
            }
            return;
          }
          this.openDetailsModal(entry);
        });

        listContainer.appendChild(card);
      });
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  populateTagFilter() {
    const select = document.getElementById("filter-tag");
    if (!select) return;

    const currentSelection = select.value;
    select.innerHTML = '<option value="">All Tags</option>';

    const allTagsSet = new Set();
    this.entries.forEach(e => {
      if (e.tags) {
        e.tags.forEach(t => allTagsSet.add(t));
      }
    });

    Array.from(allTagsSet).sort().forEach(tag => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = `#${tag}`;
      if (tag === currentSelection) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  // --- CALENDAR VIEW ---

  renderCalendar() {
    const grid = document.getElementById("calendar-days-grid");
    const monthYearHeading = document.getElementById("calendar-month-year");
    if (!grid || !monthYearHeading) return;

    grid.innerHTML = "";

    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    monthYearHeading.textContent = `${monthNames[month]} ${year}`;

    // Get first day of the month (0 = Sunday, 6 = Saturday)
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    // Get total number of days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Map entries in this month by date string YYYY-MM-DD
    const entriesMap = {};
    this.entries.forEach(entry => {
      entriesMap[entry.date] = entry;
    });

    // 1. Pad start of calendar grid with empty items
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "calendar-day empty";
      grid.appendChild(emptyDiv);
    }

    // 2. Generate days
    const todayStr = new Date().toISOString().split('T')[0];

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dayCell = document.createElement("div");
      dayCell.className = "calendar-day";

      // Formulate date string
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      dayCell.setAttribute("data-date", dateString);

      // Day label
      const dayNumLabel = document.createElement("span");
      dayNumLabel.className = "calendar-day-num";
      dayNumLabel.textContent = dayNum;
      dayCell.appendChild(dayNumLabel);

      // Check if matches today
      if (dateString === todayStr) {
        dayCell.classList.add("today");
      }

      // Check if matches selected date indicator
      if (dateString === this.selectedCalendarDate) {
        dayCell.classList.add("selected");
      }

      // Check for entry
      const dayEntry = entriesMap[dateString];
      if (dayEntry) {
        dayCell.classList.add("has-entry");
        dayCell.setAttribute("data-mood", dayEntry.mood);

        const moodDot = document.createElement("div");
        moodDot.className = "calendar-mood-dot";
        dayCell.appendChild(moodDot);
      }

      // Day Click action
      dayCell.addEventListener("click", () => {
        document.querySelectorAll(".calendar-day").forEach(c => c.classList.remove("selected"));
        dayCell.classList.add("selected");
        this.selectedCalendarDate = dateString;
        this.renderCalendarSidebarDetails(dayEntry, dateString);
      });

      grid.appendChild(dayCell);
    }

    // Populate sidebar details with default/previous state
    if (this.selectedCalendarDate) {
      const matchedEntry = this.entries.find(e => e.date === this.selectedCalendarDate);
      this.renderCalendarSidebarDetails(matchedEntry, this.selectedCalendarDate);
    } else {
      const matchedEntry = this.entries.find(e => e.date === todayStr);
      this.renderCalendarSidebarDetails(matchedEntry, todayStr);
      this.selectedCalendarDate = todayStr;
      
      // Auto select today on initial grid load
      const todayCell = grid.querySelector(`[data-date="${todayStr}"]`);
      if (todayCell) todayCell.classList.add("selected");
    }
  }

  renderCalendarSidebarDetails(entry, dateString) {
    const container = document.getElementById("selected-day-details");
    if (!container) return;

    const dateObj = new Date(dateString + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    if (entry) {
      const moodLabels = { 5: "🔥 Rad", 4: "😊 Good", 3: "😐 Meh", 2: "😔 Awful", 1: "😢 Terrible" };
      const imageHTML = entry.image ? `<img class="day-details-img" src="${entry.image}" alt="Cover Memory">` : "";
      const excerptText = this.parseMarkdown(entry.content);

      container.innerHTML = `
        <div class="day-details-title-row">
          <h4>${entry.title}</h4>
        </div>
        <div class="day-details-meta">
          <span>${formattedDate}</span>
          <span>•</span>
          <span style="color: ${this.moodColors[entry.mood]}">${moodLabels[entry.mood]}</span>
        </div>
        ${imageHTML}
        <div class="day-details-body markdown-rendered">
          ${excerptText}
        </div>
        <div class="day-details-actions">
          <button class="btn btn-secondary btn-sm" id="cal-edit-btn">Edit</button>
          <button class="btn btn-danger btn-sm" id="cal-delete-btn">Delete</button>
        </div>
      `;

      // Assign event handlers to dynamically created buttons
      document.getElementById("cal-edit-btn").addEventListener("click", () => this.loadEntryForEditing(entry.id));
      document.getElementById("cal-delete-btn").addEventListener("click", () => this.deleteEntry(entry.id));
    } else {
      // Empty day layout
      container.innerHTML = `
        <div class="empty-selection">
          <i data-lucide="edit-3"></i>
          <p>${formattedDate}</p>
          <span style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:1rem;">No entry recorded for this day yet.</span>
          <button class="btn btn-primary btn-sm" id="cal-create-new-btn">Write Entry</button>
        </div>
      `;

      document.getElementById("cal-create-new-btn").addEventListener("click", () => {
        this.resetEditor();
        document.getElementById("entry-date").value = dateString;
        this.navigateTo("editor");
      });
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- ANALYTICS VIEW ---

  renderAnalytics() {
    if (this.entries.length === 0) {
      // Set values to defaults
      document.getElementById("analytic-avg-mood").textContent = "—";
      document.getElementById("analytic-total-words").textContent = "0";
      document.getElementById("analytic-unique-tags").textContent = "0";

      // Display empty status in charts
      document.getElementById("chart-mood-trend-container").innerHTML = '<div class="empty-chart-text">Not enough data yet. Create entries to generate charts.</div>';
      document.getElementById("chart-mood-donut-container").innerHTML = '<div class="empty-chart-text">Not enough data yet.</div>';
      document.getElementById("tag-frequency-container").innerHTML = '<div class="empty-chart-text">Not enough data yet.</div>';
      return;
    }

    // 1. Stats computations
    let totalMoodScore = 0;
    let totalWords = 0;
    const uniqueTags = new Set();

    this.entries.forEach(e => {
      totalMoodScore += e.mood;
      totalWords += this.countWords(e.content);
      if (e.tags) e.tags.forEach(t => uniqueTags.add(t));
    });

    const avgMood = (totalMoodScore / this.entries.length).toFixed(1);
    document.getElementById("analytic-avg-mood").textContent = avgMood;
    document.getElementById("analytic-total-words").textContent = totalWords.toLocaleString();
    document.getElementById("analytic-unique-tags").textContent = uniqueTags.size;

    // 2. Render SVG Charts
    this.drawMoodTrendLineChart();
    this.drawMoodDonutChart();
    this.drawPopularTagsChart();
  }

  drawMoodTrendLineChart() {
    const container = document.getElementById("chart-mood-trend-container");
    if (!container) return;

    // We plot chronological chronological values (oldest to newest) up to last 15 entries
    const items = [...this.entries].reverse().slice(-15);
    
    if (items.length < 2) {
      container.innerHTML = '<div class="empty-chart-text">Need at least 2 entries to display trend patterns.</div>';
      return;
    }

    // Set up SVG container
    container.innerHTML = `
      <svg id="svg-mood-trend" viewBox="0 0 800 280" width="100%" height="100%">
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    `;
    const svg = document.getElementById("svg-mood-trend");

    const width = 800;
    const height = 280;
    const padding = { top: 30, right: 40, bottom: 40, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Render Grid Lines & Mood Y-Axis Labels
    const moods = [
      { val: 5, label: "Rad 🔥" },
      { val: 4, label: "Good 😊" },
      { val: 3, label: "Meh 😐" },
      { val: 2, label: "Awful 😔" },
      { val: 1, label: "Terrible 😢" }
    ];

    moods.forEach(mood => {
      // Y position logic (mood 5 at top, mood 1 at bottom)
      const y = padding.top + chartHeight - ((mood.val - 1) / 4) * chartHeight;

      // Line
      const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("x1", padding.left);
      gridLine.setAttribute("y1", y);
      gridLine.setAttribute("x2", width - padding.right);
      gridLine.setAttribute("y2", y);
      gridLine.setAttribute("class", "chart-grid-line");
      svg.appendChild(gridLine);

      // Label
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", padding.left - 10);
      txt.setAttribute("y", y + 4);
      txt.setAttribute("text-anchor", "end");
      txt.setAttribute("class", "chart-axis-label");
      txt.textContent = mood.label;
      svg.appendChild(txt);
    });

    // Compute coordinate points
    const points = [];
    const count = items.length;
    items.forEach((item, index) => {
      const x = padding.left + (index / (count - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((item.mood - 1) / 4) * chartHeight;
      points.push({ x, y, item });
    });

    // Build the SVG path strings
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    let areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // 1. Draw gradient area fill
    const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    areaPath.setAttribute("d", areaD);
    areaPath.setAttribute("class", "chart-area");
    svg.appendChild(areaPath);

    // 2. Draw line path
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", pathD);
    linePath.setAttribute("class", "chart-line");
    svg.appendChild(linePath);

    // 3. Render circular data point nodes with date/title descriptors
    points.forEach(pt => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", 5);
      circle.setAttribute("class", "chart-point");
      circle.style.fill = this.moodColors[pt.item.mood];

      // Add SVG tooltip title helper
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      const dObj = new Date(pt.item.date + "T00:00:00");
      const dStr = dObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      title.textContent = `${dStr}: "${pt.item.title}" (${pt.item.mood}/5)`;
      circle.appendChild(title);

      // Open detail modal on node click
      circle.addEventListener("click", () => {
        this.openDetailsModal(pt.item);
      });

      svg.appendChild(circle);

      // Render mini dates text labels on bottom axis for every other node to prevent crowding
      if (count <= 7 || points.indexOf(pt) % 2 === 0) {
        const dateLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const dObj = new Date(pt.item.date + "T00:00:00");
        const dStr = dObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dateLabel.setAttribute("x", pt.x);
        dateLabel.setAttribute("y", height - padding.bottom + 20);
        dateLabel.setAttribute("text-anchor", "middle");
        dateLabel.setAttribute("class", "chart-axis-label");
        dateLabel.textContent = dStr;
        svg.appendChild(dateLabel);
      }
    });
  }

  drawMoodDonutChart() {
    const container = document.getElementById("chart-mood-donut-container");
    if (!container) return;

    // Count distributions
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    this.entries.forEach(e => {
      if (counts[e.mood] !== undefined) counts[e.mood]++;
    });

    const total = this.entries.length;

    container.innerHTML = `
      <svg id="svg-mood-donut" viewBox="0 0 200 200" width="100%" height="100%">
        <circle class="donut-hole" cx="100" cy="100" r="70"></circle>
      </svg>
      <div class="donut-legend" id="donut-legend-list"></div>
    `;

    const svg = document.getElementById("svg-mood-donut");
    const legend = document.getElementById("donut-legend-list");

    const moods = [
      { val: 5, label: "Rad", emoji: "🔥" },
      { val: 4, label: "Good", emoji: "😊" },
      { val: 3, label: "Meh", emoji: "😐" },
      { val: 2, label: "Awful", emoji: "😔" },
      { val: 1, label: "Terrible", emoji: "😢" }
    ];

    let accumulatedPercentage = 0;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    moods.forEach(mood => {
      const count = counts[mood.val];
      const pct = total > 0 ? count / total : 0;

      if (pct > 0) {
        const strokeDashArray = `${pct * circumference} ${circumference}`;
        const strokeDashOffset = -accumulatedPercentage * circumference;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        path.setAttribute("cx", 100);
        path.setAttribute("cy", 100);
        path.setAttribute("r", radius);
        path.setAttribute("class", "donut-segment");
        path.setAttribute("stroke", this.moodColors[mood.val]);
        path.setAttribute("stroke-dasharray", strokeDashArray);
        path.setAttribute("stroke-dashoffset", strokeDashOffset);
        // Rotate SVG circles to start at 12 o'clock (-90 degrees)
        path.setAttribute("transform", "rotate(-90 100 100)");

        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${mood.label}: ${count} entries (${Math.round(pct * 100)}%)`;
        path.appendChild(title);

        svg.appendChild(path);
        accumulatedPercentage += pct;
      }

      // Add to legend
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = `
        <span class="legend-color" style="background-color: ${this.moodColors[mood.val]}"></span>
        <span>${mood.emoji} ${mood.label} (${count})</span>
      `;
      legend.appendChild(item);
    });
  }

  drawPopularTagsChart() {
    const container = document.getElementById("tag-frequency-container");
    if (!container) return;

    // Compute tag occurrences
    const counts = {};
    this.entries.forEach(e => {
      if (e.tags) {
        e.tags.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (sortedTags.length === 0) {
      container.innerHTML = '<div class="empty-chart-text">Add tag identifiers inside the editor to generate summaries.</div>';
      return;
    }

    container.innerHTML = "";
    
    // Take top 5
    const topTags = sortedTags.slice(0, 5);
    const maxVal = topTags[0][1]; // Highest frequency determines 100% width reference

    topTags.forEach(([tag, count]) => {
      const pct = (count / maxVal) * 100;

      const row = document.createElement("div");
      row.className = "tag-bar-row";
      row.innerHTML = `
        <span class="tag-bar-label" title="#${tag}">#${tag}</span>
        <div class="tag-bar-track">
          <div class="tag-bar-fill" style="width: 0%;"></div>
        </div>
        <span class="tag-bar-count">${count}</span>
      `;

      container.appendChild(row);

      // Trigger CSS width transition on next render frame to animate filling
      setTimeout(() => {
        const fillEl = row.querySelector(".tag-bar-fill");
        if (fillEl) fillEl.style.width = `${pct}%`;
      }, 50);
    });
  }

  // --- DETAIL VIEWER MODAL ---

  openDetailsModal(entry) {
    const modal = document.getElementById("entry-details-modal");
    if (!modal) return;

    // Date formatting
    const dObj = new Date(entry.date + "T00:00:00");
    const dStr = dObj.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById("modal-entry-date").textContent = dStr;

    // Mood badge
    const moodLabels = { 5: "🔥 Rad", 4: "😊 Good", 3: "😐 Meh", 2: "😔 Awful", 1: "😢 Terrible" };
    document.getElementById("modal-entry-mood").textContent = moodLabels[entry.mood] || "😐 Meh";
    
    // Assign modal badge coloring
    const badge = document.getElementById("modal-entry-mood");
    badge.style.color = this.moodColors[entry.mood];
    badge.style.borderColor = this.moodColors[entry.mood];
    badge.style.background = `${this.moodColors[entry.mood]}1A`; // 10% opacity hex code addition

    // Title & Content
    document.getElementById("modal-entry-title").textContent = entry.title;
    document.getElementById("modal-entry-content").innerHTML = this.parseMarkdown(entry.content);

    // Image memory cover
    const imgContainer = document.getElementById("modal-image-container");
    const img = document.getElementById("modal-entry-img");
    if (entry.image) {
      imgContainer.classList.remove("hidden");
      img.src = entry.image;
    } else {
      imgContainer.classList.add("hidden");
      img.src = "";
    }

    // Tags
    const tagsWrapper = document.getElementById("modal-entry-tags");
    tagsWrapper.innerHTML = "";
    if (entry.tags && entry.tags.length > 0) {
      entry.tags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.textContent = `#${tag}`;
        tagsWrapper.appendChild(badge);
      });
      tagsWrapper.classList.remove("hidden");
    } else {
      tagsWrapper.classList.add("hidden");
    }

    // Modal action assignments
    document.getElementById("modal-delete-btn").setAttribute("data-entry-id", entry.id);
    document.getElementById("modal-edit-btn").setAttribute("data-entry-id", entry.id);

    // Activate modal
    modal.classList.add("active");

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- DATABASE EXPORT & RESTORE ---

  exportToJSON() {
    if (this.entries.length === 0) {
      alert("No data available to export.");
      return;
    }
    const dataStr = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetheria_journal_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  exportToMarkdown() {
    if (this.entries.length === 0) {
      alert("No data available to export.");
      return;
    }

    let fileContent = `# AETHERIA JOURNAL ARCHIVE\nExported: ${new Date().toLocaleString()}\nAuthor: ${this.userName}\n\n=========================================\n\n`;

    // Sort chronologically oldest to newest for archive layout
    const archive = [...this.entries].reverse();

    archive.forEach(e => {
      const dObj = new Date(e.date + "T00:00:00");
      const dStr = dObj.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const moodLabels = { 5: "Rad (5/5)", 4: "Good (4/5)", 3: "Meh (3/5)", 2: "Awful (2/5)", 1: "Terrible (1/5)" };
      
      fileContent += `## ${e.title}\n`;
      fileContent += `Date: ${dStr}\n`;
      fileContent += `Mood: ${moodLabels[e.mood] || "Meh"}\n`;
      fileContent += `Tags: ${(e.tags || []).map(t => `#${t}`).join(", ") || "None"}\n`;
      fileContent += `\n${e.content}\n\n`;
      fileContent += `---------------------------------------------------------\n\n`;
    });

    const blob = new Blob([fileContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetheria_journal_archive_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  handleJSONImport(e) {
    const file = e.target.files[0];
    const fileNameDisplay = document.getElementById("import-file-name");
    
    if (!file) return;
    fileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        
        // Validation check
        if (!Array.isArray(parsed)) {
          throw new Error("Invalid backup format: File must contain a JSON array.");
        }

        // Validate basic properties
        let isValid = true;
        parsed.forEach(item => {
          if (!item.id || !item.title || !item.date || item.mood === undefined) {
            isValid = false;
          }
        });

        if (!isValid) {
          throw new Error("Invalid structures: Entries require Title, Date, ID, and Mood properties.");
        }

        if (confirm(`Valid backup verified. Do you want to merge these ${parsed.length} entries with your current journal logs?`)) {
          // Merge avoiding identical ID duplicates
          const currentIds = new Set(this.entries.map(ent => ent.id));
          let mergedCount = 0;
          parsed.forEach(item => {
            if (!currentIds.has(item.id)) {
              this.entries.push(item);
              mergedCount++;
            }
          });

          // Sort entries chronologically newest first
          this.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          this.saveToLocalStorage();
          this.navigateTo("dashboard");
          alert(`Successfully imported backup. Added ${mergedCount} new journal logs!`);
        }
      } catch (err) {
        alert(`Error importing database: ${err.message}`);
        fileNameDisplay.textContent = "No file selected";
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  wipeDatabase() {
    const confirmation1 = confirm("⚠️ DANGER: You are about to permanently erase all journal entries and configurations. This action CANNOT be undone. Proceed?");
    if (confirmation1) {
      const confirmation2 = confirm("Please confirm once more. Are you absolutely certain you want to wipe Aetheria clean?");
      if (confirmation2) {
        localStorage.removeItem("aetheria_entries");
        localStorage.removeItem("aetheria_username");
        localStorage.removeItem("aetheria_theme");
        
        this.entries = [];
        this.userName = "Journaler";
        this.selectedTheme = "dark";
        
        this.applyTheme("dark");
        this.resetEditor();
        this.navigateTo("dashboard");
        alert("Aetheria local database wiped clean successfully.");
      }
    }
  }

  // --- STREAK & MOOD COMPUTATIONS ---

  calculateStreak() {
    if (this.entries.length === 0) return 0;

    // Gather unique list of write dates, sorted descending
    const dateStrings = Array.from(new Set(this.entries.map(e => e.date))).sort((a, b) => new Date(b) - new Date(a));
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If latest entry is neither today nor yesterday, streak is broken (0)
    if (dateStrings[0] !== todayStr && dateStrings[0] !== yesterdayStr) {
      return 0;
    }

    let streakCount = 1;
    let currentCheckDate = new Date(dateStrings[0] + "T00:00:00");

    for (let i = 1; i < dateStrings.length; i++) {
      // Calculate day difference
      const nextDate = new Date(dateStrings[i] + "T00:00:00");
      const diffTime = Math.abs(currentCheckDate - nextDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streakCount++;
        currentCheckDate = nextDate;
      } else if (diffDays > 1) {
        break; // Streak broken
      }
    }

    return streakCount;
  }

  calculateDominantMood() {
    if (this.entries.length === 0) return "—";

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    this.entries.forEach(e => {
      if (counts[e.mood] !== undefined) counts[e.mood]++;
    });

    let maxVal = -1;
    let dominantScore = 3;

    // Iterate backwards so higher moods take priority if tie
    for (let m = 5; m >= 1; m--) {
      if (counts[m] > maxVal) {
        maxVal = counts[m];
        dominantScore = m;
      }
    }

    const moodNames = { 5: "🔥 Rad", 4: "😊 Good", 3: "😐 Meh", 2: "😔 Awful", 1: "😢 Terrible" };
    return maxVal === 0 ? "—" : moodNames[dominantScore];
  }

  // --- TEXT PROCESSING HELPER FUNCTIONS ---

  countWords(str) {
    if (!str) return 0;
    const cleanStr = str.trim().replace(/\s+/g, ' ');
    return cleanStr === "" ? 0 : cleanStr.split(' ').length;
  }

  stripMarkdownForExcerpt(md) {
    if (!md) return "";
    let plain = md
      .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
      .replace(/\*([^*]+)\*/g, "$1")     // italic
      .replace(/###\s+(.*)/g, "$1")       // headings
      .replace(/>\s+(.*)/g, "$1")         // blockquote
      .replace(/-\s+(.*)/g, "$1")         // lists
      .replace(/`([^`]+)`/g, "$1")       // inline code
      .replace(/\n+/g, " ");             // newlines to space
    
    return plain.trim();
  }

  parseMarkdown(md) {
    if (!md) return "";
    
    // HTML Escape to prevent cross-site scripting
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings ###
    html = html.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^##\s+(.*)$/gm, "<h3>$1</h3>"); // fallbacks
    html = html.replace(/^#\s+(.*)$/gm, "<h3>$1</h3>");

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic *text*
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Blockquotes > text
    // Replace markdown > lines with blockquotes.
    html = html.replace(/^&gt;\s+(.*)$/gm, "<blockquote>$1</blockquote>");

    // Bullet lists - text
    html = html.replace(/^\-\s+(.*)$/gm, "<li>$1</li>");
    // Simple wrap continuous list items. In a lightweight parser we can do:
    // replacing sequences of <li>...</li> with <ul><li>...</li></ul>
    html = html.replace(/(<li>.*<\/li>)/g, "<ul>$1<\/ul>");
    // Clean nested duplicate <ul> tags if any
    html = html.replace(/<\/ul>\s*<ul>/g, "");

    // Numbered lists 1. text
    html = html.replace(/^\d+\.\s+(.*)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/g, "<ol>$1<\/ol>");
    html = html.replace(/<\/ol>\s*<ol>/g, "");

    // Inline Code `code`
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Paragraph returns
    html = html.replace(/\n/g, "<br>");

    return html;
  }

  // --- CLOUD SYNCING & SUPABASE ---

  async initSupabase() {
    const url = localStorage.getItem("aetheria_supabase_url");
    const key = localStorage.getItem("aetheria_supabase_key");

    const urlInput = document.getElementById("settings-supabase-url");
    const keyInput = document.getElementById("settings-supabase-key");
    const clearBtn = document.getElementById("clear-supabase-config-btn");
    const saveBtn = document.getElementById("save-supabase-config-btn");
    const authPanel = document.getElementById("supabase-auth-panel");
    const loggedOutForm = document.getElementById("auth-logged-out-form");
    const loggedInPanel = document.getElementById("auth-logged-in-panel");
    const emailDisplay = document.getElementById("cloud-user-email");

    if (urlInput) urlInput.value = url || "";
    if (keyInput) keyInput.value = key || "";

    if (url && key) {
      if (clearBtn) clearBtn.classList.remove("hidden");
      if (saveBtn) saveBtn.textContent = "Update Credentials";
      if (authPanel) authPanel.classList.remove("hidden");

      // Update status to connecting
      this.updateCloudStatus("connecting", "Connecting...");

      try {
        this.supabase = window.supabase.createClient(url, key);
        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          this.supabaseUser = session.user;
          if (emailDisplay) emailDisplay.textContent = this.supabaseUser.email;
          if (loggedOutForm) loggedOutForm.classList.add("hidden");
          if (loggedInPanel) loggedInPanel.classList.remove("hidden");
          this.updateCloudStatus("online", "Cloud Synced");
          
          // Initial sync
          await this.syncCloudEntries();
        } else {
          this.supabaseUser = null;
          if (loggedOutForm) loggedOutForm.classList.remove("hidden");
          if (loggedInPanel) loggedInPanel.classList.add("hidden");
          this.updateCloudStatus("offline", "Cloud Connected");
        }
      } catch (err) {
        console.error("Supabase init error:", err);
        this.updateCloudStatus("offline", "Sync Error");
        this.supabase = null;
        this.supabaseUser = null;
      }
    } else {
      if (clearBtn) clearBtn.classList.add("hidden");
      if (saveBtn) saveBtn.textContent = "Connect Backend";
      if (authPanel) authPanel.classList.add("hidden");
      this.updateCloudStatus("offline", "Local Vault");
      this.supabase = null;
      this.supabaseUser = null;
    }
  }

  updateCloudStatus(statusClass, text) {
    const badge = document.getElementById("sidebar-cloud-status");
    if (!badge) return;

    const dot = badge.querySelector(".status-dot");
    const txt = badge.querySelector(".status-text");

    if (dot && txt) {
      dot.className = `status-dot ${statusClass}`;
      txt.textContent = text;
    }
  }

  async handleSupabaseSaveCredentials() {
    const url = document.getElementById("settings-supabase-url").value.trim();
    const key = document.getElementById("settings-supabase-key").value.trim();

    if (!url || !key) {
      alert("Please provide both your Supabase URL and Anon Key.");
      return;
    }

    localStorage.setItem("aetheria_supabase_url", url);
    localStorage.setItem("aetheria_supabase_key", key);

    alert("Supabase configurations saved. Initialising connection...");
    await this.initSupabase();
  }

  async handleSupabaseDisconnectCloud() {
    if (confirm("Are you sure you want to disconnect from Supabase? This will log you out and return Aetheria to offline Local Vault mode.")) {
      if (this.supabase) {
        try {
          await this.supabase.auth.signOut();
        } catch (e) {
          console.error("Sign out on disconnect failed", e);
        }
      }
      localStorage.removeItem("aetheria_supabase_url");
      localStorage.removeItem("aetheria_supabase_key");
      
      const urlInput = document.getElementById("settings-supabase-url");
      const keyInput = document.getElementById("settings-supabase-key");
      if (urlInput) urlInput.value = "";
      if (keyInput) keyInput.value = "";

      await this.initSupabase();
      this.renderDashboard();
      this.renderCalendar();
      this.renderAnalytics();
      alert("Disconnected successfully.");
    }
  }

  async handleCloudSignIn() {
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;

    if (!email || !password) {
      alert("Please fill in email and password credentials.");
      return;
    }

    this.updateCloudStatus("connecting", "Signing In...");
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      alert("Sign In successful!");
      await this.initSupabase();
      this.renderDashboard();
      this.renderCalendar();
      this.renderAnalytics();
    } catch (err) {
      alert(`Sign In failed: ${err.message}`);
      this.updateCloudStatus("offline", "Cloud Connected");
    }
  }

  async handleCloudSignUp() {
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;

    if (!email || !password) {
      alert("Please fill in email and password credentials.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    this.updateCloudStatus("connecting", "Registering...");
    try {
      const { data, error } = await this.supabase.auth.signUp({ email, password });
      if (error) throw error;

      alert("Account registration initiated! If email confirmation is enabled on your Supabase project, check your inbox and click the verification link before signing in.");
      this.updateCloudStatus("offline", "Cloud Connected");
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
      this.updateCloudStatus("offline", "Cloud Connected");
    }
  }

  async handleCloudSignOut() {
    if (confirm("Sign out of Aetheria Cloud Vault? Local copies of entries will remain on this browser.")) {
      try {
        if (this.supabase) {
          await this.supabase.auth.signOut();
        }
      } catch (err) {
        console.error("Signout error", err);
      }
      this.supabaseUser = null;
      await this.initSupabase();
      this.renderDashboard();
      this.renderCalendar();
      this.renderAnalytics();
      alert("Logged out of Cloud Vault.");
    }
  }

  async syncCloudEntries() {
    if (!this.supabase || !this.supabaseUser) return;

    this.updateCloudStatus("connecting", "Syncing Cloud...");

    try {
      // 1. Fetch current cloud entries
      const { data: cloudEntries, error } = await this.supabase
        .from('entries')
        .select('*');

      if (error) throw error;

      const cloudMap = new Map(cloudEntries.map(e => [e.id, e]));

      // 2. Identify local entries that are new or different and upload them
      for (const localEntry of this.entries) {
        const cloudEntry = cloudMap.get(localEntry.id);
        
        // If it doesn't exist in the cloud, or has different properties
        if (!cloudEntry || 
            cloudEntry.title !== localEntry.title || 
            cloudEntry.date !== localEntry.date || 
            cloudEntry.mood !== localEntry.mood || 
            cloudEntry.content !== localEntry.content || 
            JSON.stringify(cloudEntry.tags || []) !== JSON.stringify(localEntry.tags || []) || 
            cloudEntry.image !== localEntry.image) {
          
          const row = {
            id: localEntry.id,
            user_id: this.supabaseUser.id,
            title: localEntry.title,
            date: localEntry.date,
            mood: localEntry.mood,
            content: localEntry.content,
            tags: localEntry.tags || [],
            image: localEntry.image || null
          };

          const { error: upsertErr } = await this.supabase.from('entries').upsert(row);
          if (upsertErr) console.error(`Failed to upsert entry ${localEntry.id} to cloud:`, upsertErr);
        }
      }

      // 3. Fetch final unified list from cloud to synchronize local state
      const { data: finalCloudEntries, error: fetchErr } = await this.supabase
        .from('entries')
        .select('*');

      if (fetchErr) throw fetchErr;

      // 4. Overwrite local entries list with merged cloud data
      this.entries = finalCloudEntries.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        mood: e.mood,
        content: e.content,
        tags: e.tags || [],
        image: e.image || null
      }));

      // Sort chronological newest first
      this.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      this.saveToLocalStorage();
      this.updateCloudStatus("online", "Cloud Synced");
      
      // Refresh views
      this.renderDashboardList();
      
      // Update filter options in dropdown
      this.populateTagFilter();

    } catch (err) {
      console.error("Cloud syncing failed:", err);
      this.updateCloudStatus("offline", "Sync Failed");
    }
  }
}

// Instantiate and expose application globally
window.addEventListener("DOMContentLoaded", () => {
  window.app = new AetheriaApp();
});
