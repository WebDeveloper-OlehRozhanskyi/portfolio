export function menuBurger() {
 const burgerButton = document.querySelector('.burger-btn')
 if (!burgerButton) return
 const menuLinks = document.querySelectorAll('.menu__list-link')

 function isMenuOpen() {
  return burgerButton.getAttribute('aria-expanded') === 'true'
 }

 function closeMenu() {
  burgerButton.setAttribute('aria-expanded', false)
 }

 burgerButton.addEventListener('click', () => {
  burgerButton.setAttribute('aria-expanded', !isMenuOpen())
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
}
