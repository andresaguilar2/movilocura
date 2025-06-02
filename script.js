// Variables globales
let currentUser = null
let currentOrigin = null
let currentDestination = null
let isAnimating = false

// Configuración
const TARIFF = 0.5 // $0.50 por segundo

// Definición del grafo con 9 aristas bidireccionales
const graph = {
  edges: [
    [1, 2, 10], // Nodo 1 a Nodo 2: 10 segundos
    [1, 3, 15], // Nodo 1 a Nodo 3: 15 segundos
    [2, 3, 12], // Nodo 2 a Nodo 3: 12 segundos
    [2, 4, 8], // Nodo 2 a Nodo 4: 8 segundos
    [3, 5, 20], // Nodo 3 a Nodo 5: 20 segundos
    [4, 5, 18], // Nodo 4 a Nodo 5: 18 segundos
    [4, 6, 14], // Nodo 4 a Nodo 6: 14 segundos
    [5, 6, 16], // Nodo 5 a Nodo 6: 16 segundos
    [1, 6, 25], // Nodo 1 a Nodo 6: 25 segundos
  ],
}

// Inicialización cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  // Verificar si hay usuario logueado
  const savedUser = localStorage.getItem("movisimple_user")
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    showMapScreen()
  }

  // Configurar event listeners
  setupEventListeners()
})

function setupEventListeners() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin)
  document.getElementById("registerForm").addEventListener("submit", handleRegister)
  document.getElementById("originSelect").addEventListener("change", handleOriginChange)
  document.getElementById("destinationSelect").addEventListener("change", handleDestinationChange)
}

// ==================== NAVEGACIÓN ENTRE PANTALLAS ====================

function showLogin() {
  hideAllScreens()
  document.getElementById("loginScreen").classList.add("active")
  clearErrors()
}

function showRegister() {
  hideAllScreens()
  document.getElementById("registerScreen").classList.add("active")
  clearErrors()
}

function showMapScreen() {
  hideAllScreens()
  document.getElementById("mapScreen").classList.add("active")
  if (currentUser) {
    document.getElementById("userName").textContent = currentUser.name
  }
  resetMapInterface()
}

function hideAllScreens() {
  const screens = document.querySelectorAll(".screen")
  screens.forEach((screen) => screen.classList.remove("active"))
}

function clearErrors() {
  const errors = document.querySelectorAll(".error-message")
  errors.forEach((error) => {
    error.classList.remove("show")
    error.textContent = ""
  })
}

// ==================== AUTENTICACIÓN ====================

function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value
  const errorDiv = document.getElementById("loginError")

  // Obtener usuarios del localStorage
  const users = JSON.parse(localStorage.getItem("movisimple_users") || "[]")
  const user = users.find((u) => u.email === email)

  if (!user) {
    showError(errorDiv, "Usuario no encontrado")
    return
  }

  if (user.password !== password) {
    showError(errorDiv, "Contraseña incorrecta")
    return
  }

  // Login exitoso
  currentUser = { name: user.name, email: user.email }
  localStorage.setItem("movisimple_user", JSON.stringify(currentUser))
  showMapScreen()
}

function handleRegister(e) {
  e.preventDefault()

  const name = document.getElementById("registerName").value
  const email = document.getElementById("registerEmail").value
  const password = document.getElementById("registerPassword").value
  const errorDiv = document.getElementById("registerError")

  // Validaciones básicas
  if (!name.trim() || !email.trim() || !password.trim()) {
    showError(errorDiv, "Todos los campos son obligatorios")
    return
  }

  // Obtener usuarios existentes
  const users = JSON.parse(localStorage.getItem("movisimple_users") || "[]")

  // Verificar si el usuario ya existe
  if (users.some((u) => u.email === email)) {
    showError(errorDiv, "El usuario ya existe")
    return
  }

  // Agregar nuevo usuario
  users.push({ name, email, password })
  localStorage.setItem("movisimple_users", JSON.stringify(users))

  // Login automático después del registro
  currentUser = { name, email }
  localStorage.setItem("movisimple_user", JSON.stringify(currentUser))
  showMapScreen()
}

function logout() {
  currentUser = null
  localStorage.removeItem("movisimple_user")
  showLogin()
}

function showError(errorDiv, message) {
  errorDiv.textContent = message
  errorDiv.classList.add("show")
}

// ==================== GESTIÓN DEL MAPA ====================

function handleOriginChange(e) {
  currentOrigin = e.target.value ? Number.parseInt(e.target.value) : null
  updateDestinationOptions()
  updateNodeColors()
  updateCalculateButton()
  hideResults()
}

function handleDestinationChange(e) {
  currentDestination = e.target.value ? Number.parseInt(e.target.value) : null
  updateNodeColors()
  updateCalculateButton()
  hideResults()
}

function updateDestinationOptions() {
  const select = document.getElementById("destinationSelect")
  select.innerHTML = '<option value="">Seleccionar destino</option>'

  for (let i = 1; i <= 6; i++) {
    if (i !== currentOrigin) {
      const option = document.createElement("option")
      option.value = i
      option.textContent = `Nodo ${i}`
      select.appendChild(option)
    }
  }

  currentDestination = null
}

function updateNodeColors() {
  // Resetear todos los nodos
  const nodes = document.querySelectorAll(".node")
  nodes.forEach((node) => {
    node.className = "node"
  })

  // Aplicar colores según estado
  if (currentOrigin) {
    document.getElementById(`node${currentOrigin}`).classList.add("origin")
  }

  if (currentDestination) {
    document.getElementById(`node${currentDestination}`).classList.add("destination")
  }
}

function updateCalculateButton() {
  const btn = document.getElementById("calculateBtn")
  btn.disabled = !currentOrigin || !currentDestination || isAnimating
}

function hideResults() {
  document.getElementById("progressContainer").style.display = "none"
  document.getElementById("tripInfo").style.display = "none"
}

function resetMapInterface() {
  currentOrigin = null
  currentDestination = null
  isAnimating = false

  document.getElementById("originSelect").value = ""
  document.getElementById("destinationSelect").value = ""

  updateDestinationOptions()
  updateNodeColors()
  updateCalculateButton()
  hideResults()
}

// ==================== ALGORITMO DE DIJKSTRA ====================

function createAdjacencyList() {
  const adjList = {}

  // Inicializar lista de adyacencia para 6 nodos
  for (let i = 1; i <= 6; i++) {
    adjList[i] = []
  }

  // Agregar aristas bidireccionales
  graph.edges.forEach(([u, v, weight]) => {
    adjList[u].push({ node: v, weight: weight })
    adjList[v].push({ node: u, weight: weight })
  })

  return adjList
}

function dijkstraSimple(source) {
  const adjList = createAdjacencyList()
  const distances = {}
  const predecessors = {}
  const visited = new Set()

  // Inicializar distancias
  for (let i = 1; i <= 6; i++) {
    distances[i] = i === source ? 0 : Number.POSITIVE_INFINITY
    predecessors[i] = null
  }

  // Algoritmo de Dijkstra
  for (let i = 0; i < 6; i++) {
    // Encontrar vértice no visitado con distancia mínima
    let minDistance = Number.POSITIVE_INFINITY
    let minVertex = -1

    for (let v = 1; v <= 6; v++) {
      if (!visited.has(v) && distances[v] < minDistance) {
        minDistance = distances[v]
        minVertex = v
      }
    }

    if (minVertex === -1) break

    visited.add(minVertex)

    // Actualizar distancias a vecinos
    adjList[minVertex].forEach((neighbor) => {
      if (!visited.has(neighbor.node)) {
        const newDistance = distances[minVertex] + neighbor.weight
        if (newDistance < distances[neighbor.node]) {
          distances[neighbor.node] = newDistance
          predecessors[neighbor.node] = minVertex
        }
      }
    })
  }

  return { distances, predecessors }
}

function reconstructPath(source, destination, predecessors) {
  const path = []
  let current = destination

  // Reconstruir el camino desde el destino hasta el origen
  while (current !== null) {
    path.unshift(current)
    current = predecessors[current]
  }

  return path
}

// ==================== CÁLCULO Y VISUALIZACIÓN DE RUTAS ====================

function calculateRoute() {
  if (!currentOrigin || !currentDestination || isAnimating) return

  // Ejecutar algoritmo de Dijkstra
  const { distances, predecessors } = dijkstraSimple(currentOrigin)
  const totalTime = distances[currentDestination]

  // Verificar si existe una ruta
  if (totalTime === Number.POSITIVE_INFINITY) {
    alert("No hay ruta disponible entre los nodos seleccionados")
    return
  }

  // Reconstruir el camino
  const path = reconstructPath(currentOrigin, currentDestination, predecessors)
  const cost = totalTime * TARIFF

  // Mostrar información del viaje
  displayTripInfo(totalTime, cost, path)

  // Colorear nodos de la ruta
  highlightRoutePath(path)

  // Iniciar animación
  startAnimation(totalTime)
}

function displayTripInfo(totalTime, cost, path) {
  document.getElementById("totalTime").textContent = totalTime
  document.getElementById("totalCost").textContent = cost.toFixed(2)

  // Mostrar ruta como badges
  const routePathDiv = document.getElementById("routePath")
  routePathDiv.innerHTML = ""

  path.forEach((node) => {
    const badge = document.createElement("span")
    badge.className = "badge"
    badge.textContent = node
    routePathDiv.appendChild(badge)
  })

  document.getElementById("tripInfo").style.display = "block"
}

function highlightRoutePath(path) {
  // Colorear nodos de la ruta (excepto origen y destino)
  path.forEach((nodeId) => {
    const node = document.getElementById(`node${nodeId}`)
    if (!node.classList.contains("origin") && !node.classList.contains("destination")) {
      node.classList.add("route")
    }
  })
}

// ==================== ANIMACIÓN ====================

function startAnimation(totalTime) {
  isAnimating = true
  updateCalculateButton()

  const progressContainer = document.getElementById("progressContainer")
  const progressFill = document.getElementById("progressFill")
  const progressPercent = document.getElementById("progressPercent")

  progressContainer.style.display = "block"

  let progress = 0
  const totalTimeMs = totalTime * 1000 // Convertir a milisegundos
  const updateInterval = 50 // Actualizar cada 50ms
  const increment = (updateInterval / totalTimeMs) * 100

  const animationInterval = setInterval(() => {
    progress += increment

    if (progress >= 100) {
      progress = 100
      clearInterval(animationInterval)

      // Finalizar animación después de 2 segundos
      setTimeout(() => {
        finishAnimation()
      }, 2000)
    }

    // Actualizar barra de progreso
    progressFill.style.width = `${progress}%`
    progressPercent.textContent = `${Math.round(progress)}%`

    // Actualizar nodo actual (opcional)
    updateCurrentNodeAnimation(progress)
  }, updateInterval)
}

function updateCurrentNodeAnimation(progress) {
  // Remover clase 'current' de todos los nodos
  document.querySelectorAll(".node").forEach((node) => {
    node.classList.remove("current")
  })

  // Esta función se puede expandir para mostrar el progreso en el mapa
  // Por ahora, simplemente mantenemos la visualización básica
}

function finishAnimation() {
  isAnimating = false

  // Resetear la interfaz después de completar el viaje
  setTimeout(() => {
    resetMapInterface()
  }, 1000)
}

// ==================== UTILIDADES ====================

// Función para debugging (opcional)
function debugGraph() {
  console.log("Grafo MoviSimple:")
  console.log("Nodos: 6")
  console.log("Aristas:", graph.edges)
  console.log("Lista de adyacencia:", createAdjacencyList())
}

// Llamar a debugGraph() en la consola para ver la estructura del grafo
