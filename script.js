// --- API ENDPOINTS (UPDATE THESE!) ---
// 1. URL for the Gemini API call (AI Reflection)
const GEMINI_CLOUD_FUNCTION_URL = "YOUR_LOCAL_FIREBASE_FUNCTION_URL_HERE";

// 2. URL for the simple PHQ-2 Quiz scoring (If using a separate Express server)
// --- CHANGED TO A HYPOTHETICAL LOCAL NETWORK ADDRESS (192.168.1.100) ---
const PHQ2_QUIZ_API_URL = "http://192.168.1.100:3000/api/checkin";

// =================================================================
// SECTION 1: AI Reflection Form (Mood & Text Entry) Logic
// =================================================================

// Safely select elements that might be missing on some pages
const moodButtons = document.querySelectorAll(".mood-btn");
const moodInput = document.getElementById("mood");
const submitButton = document.getElementById("submit-btn");
const entryTextarea = document.getElementById("entry");
const outputDiv = document.getElementById("reflection-output");
const loadingDiv = document.getElementById("loading");
const checkinForm = document.getElementById("checkin-form");

/**
 * UI/UX: Check form validity to enable/disable submit button
 */
function checkFormValidity() {
  // Only proceed if all required elements are present
  if (!moodInput || !entryTextarea || !submitButton) return;

  // Check if mood is selected and entry has at least 6 characters (length > 5)
  const isMoodSelected = moodInput.value !== "";
  const isEntryFilled = entryTextarea.value.trim().length > 5;

  submitButton.disabled = !(isMoodSelected && isEntryFilled);
}

/**
 * UI/UX: Handle mood button selection and animation
 * @param {HTMLElement} button - The button clicked.
 */
function handleMoodSelection(button) {
  if (!moodInput) return; // Safety check

  moodButtons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
  moodInput.value = button.getAttribute("data-mood");
  checkFormValidity();
}

// Attach listeners for AI Reflection Form (Section 1) only if elements exist
if (moodButtons.length > 0 && entryTextarea) {
  moodButtons.forEach((button) => {
    button.addEventListener("click", () => handleMoodSelection(button));
  });
  entryTextarea.addEventListener("input", checkFormValidity);

  // Initialize button state on load
  checkFormValidity();
}

// 3. CORE LOGIC: Handle AI Reflection form submission
if (checkinForm && moodInput && entryTextarea && outputDiv && loadingDiv) {
  checkinForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const mood = moodInput.value;
    const entry = entryTextarea.value;

    // Disable button immediately to prevent double submission
    submitButton.disabled = true;

    // Start loading animation and hide previous content
    outputDiv.innerHTML = "";
    outputDiv.classList.remove("show");
    outputDiv.style.display = "none";
    loadingDiv.style.display = "block";

    try {
      const response = await fetch(GEMINI_CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, entry }),
      });

      if (!response.ok) {
        // Throw an error with the actual status and status text
        throw new Error(
          `HTTP error! Status: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();

      // Validate expected data structure from AI
      if (!data.reflection || !data.suggestion) {
        throw new Error(
          "Invalid response format from Gemini API. Missing 'reflection' or 'suggestion'."
        );
      }

      // Display the data and trigger the slide-in animation
      outputDiv.innerHTML = `
                <h3>Your Reflection:</h3>
                <p>${data.reflection}</p>
                <p style="font-style: italic; margin-top: 10px;">Suggested Activity: ${data.suggestion}</p>
            `;

      outputDiv.style.display = "block";
      outputDiv.classList.add("show");
    } catch (error) {
      console.error("Gemini Connection Error:", error);
      outputDiv.innerHTML = `<p style="color: red; font-weight: bold;">Connection Failed: Is the Firebase function/emulator running? Error: ${error.message}</p>`;
      outputDiv.style.display = "block";
    } finally {
      // Stop loading animation
      loadingDiv.style.display = "none";

      // Clear form elements for next entry
      entryTextarea.value = "";
      moodInput.value = "";
      checkFormValidity(); // Re-run validity check to disable button
      moodButtons.forEach((btn) => btn.classList.remove("active"));
    }
  });
}

// =================================================================
// SECTION 2: PHQ-2 Quiz Logic
// =================================================================

const quizForm = document.getElementById("mental-health-quiz");
const resultDisplay = document.getElementById("result-display");
const resultMessage = document.getElementById("result-message");
const resourceButton = document.getElementById("resource-button");

// Define the PHQ-2 questions and scoring options
const questions = [
  {
    id: "q1",
    text: "1. Over the past two weeks, how often have you been bothered by having little interest or pleasure in doing things?",
  },
  {
    id: "q2",
    text: "2. Over the past two weeks, how often have you been bothered by feeling down, depressed, or hopeless?",
  },
];
const options = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

/**
 * Renders the quiz questions dynamically into the HTML form.
 */
function renderQuiz() {
  if (!quizForm) return;

  let html = "";
  questions.forEach((q) => {
    html += `
            <fieldset>
                <legend>${q.text}</legend>
                <div class="quiz-options-group">
                ${options
                  .map(
                    (opt) => `
                    <label class="quiz-radio-label">
                        <input type="radio" name="${q.id}" value="${opt.value}" required>
                        <span>${opt.label}</span>
                    </label>
                `
                  )
                  .join("")}
                </div>
            </fieldset>
        `;
  });
  html +=
    '<button type="submit" class="submit-quiz-btn">Submit Oasis Check-in</button>';
  quizForm.innerHTML = html;
}

// Render the quiz only if the element exists
if (quizForm) {
  renderQuiz();
}

// PHQ-2 QUIZ SUBMISSION LISTENER
if (quizForm && resultDisplay && resultMessage) {
  quizForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = quizForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true; // Disable button while fetching

    const formData = new FormData(quizForm);
    const scoreData = {};
    for (const [key, value] of formData.entries()) {
      // Ensure the value is converted to an integer for scoring
      scoreData[key] = parseInt(value, 10);
      if (isNaN(scoreData[key])) {
        console.error(`Invalid score value for ${key}: ${value}`);
        // Re-enable button and return
        if (submitBtn) submitBtn.disabled = false;
        alert("Error: Invalid quiz score submitted. Please check inputs.");
        return;
      }
    }

    try {
      const response = await fetch(PHQ2_QUIZ_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoreData),
      });

      if (!response.ok) {
        // Throw an error with the actual status and status text
        throw new Error(
          `HTTP error! Status: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();

      // Display result
      resultMessage.innerHTML = `<strong>Your Total Score is: ${data.totalScore}</strong><br><br>${data.message}`;
      quizForm.classList.add("hidden");
      resultDisplay.classList.remove("hidden");
    } catch (error) {
      resultMessage.innerHTML = `
                <strong>Connection Error.</strong> 
                Please ensure the backend server for the quiz is running on <code>${PHQ2_QUIZ_API_URL}</code>.
                <br>Error: ${error.message}
            `;

      quizForm.classList.add("hidden");
      resultDisplay.classList.remove("hidden");

      console.error("Error submitting PHQ-2 quiz:", error);
    } finally {
      // Re-enable button only if we are still on the quiz form
      if (submitBtn && !quizForm.classList.contains("hidden")) {
        submitBtn.disabled = false;
      }
    }
  });
}

// Resource Button Handler
if (resourceButton) {
  resourceButton.addEventListener("click", () => {
    console.log(
      "Redirecting to a page with crisis hotlines, therapy links, and self-care articles."
    );
    alert(
      "Redirecting to a page with crisis hotlines, therapy links, and self-care articles."
    );
    // Implement actual redirection here: window.location.href = '/resources';
  });
}
