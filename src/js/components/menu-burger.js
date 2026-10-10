export function menuBurger() {
 const burgerButton = document.querySelector('.burger-btn')

 burgerButton.addEventListener('click', () => {
  const isOpen = burgerButton.getAttribute('aria-expanded') === 'true'
  burgerButton.setAttribute('aria-expanded', !isOpen)
 })
}
