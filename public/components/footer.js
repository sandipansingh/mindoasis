class AppFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <footer class="site-footer">
     <p>&copy; 2025 Mind Oasis. All rights reserved.</p>
     <div class="footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Contact Us</a>
     </div>
    </footer>
    `;
  }
}

customElements.define("app-footer", AppFooter);
