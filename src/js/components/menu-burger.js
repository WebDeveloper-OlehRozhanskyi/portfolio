export function menuBurger() {
 const burgerButton = document.querySelector('.burger-btn')
 const menuLinks = document.querySelectorAll('.menu__list-link')

 burgerButton.addEventListener('click', () => {
  const isOpen = burgerButton.getAttribute('aria-expanded') === 'true'
  burgerButton.setAttribute('aria-expanded', !isOpen)
 })

 function closeMenu() {
  burgerButton.setAttribute('aria-expanded', false)
 }

 menuLinks.forEach(link => {
  link.addEventListener('click', closeMenu)
 })

 document.addEventListener('keydown', event => {
  const isOpen = burgerButton.getAttribute('aria-expanded') === 'true'
  if (event.key === 'Escape' && isOpen) {
   closeMenu()
   burgerButton.focus()
  }
 })
}
