export function menuBurger() {
 const burgerButton = document.querySelector('.burger-btn')
 if (!burgerButton) return
 const menuLinks = document.querySelectorAll('.menu__list-link')
 const main = document.querySelector('.main')
 const footer = document.querySelector('.footer')
 // Дублює змінну bm з _variables.scss
 const mobileQuery = window.matchMedia('(max-width: 47.99875rem)')

 function isMenuOpen() {
  return burgerButton.getAttribute('aria-expanded') === 'true'
 }

 function setMenuOpen(isOpen) {
  burgerButton.setAttribute('aria-expanded', isOpen)
  main.inert = isOpen
  footer.inert = isOpen
 }

 function closeMenu() {
  setMenuOpen(false)
 }

 burgerButton.addEventListener('click', () => {
  setMenuOpen(!isMenuOpen())
 })

 menuLinks.forEach(link => {
  link.addEventListener('click', closeMenu)
 })

 document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && isMenuOpen()) {
   closeMenu()
   burgerButton.focus()
  }
 })

 mobileQuery.addEventListener('change', closeMenu)
}
