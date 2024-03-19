document.getElementById('image-trigger').addEventListener('click', function () {
    const element = document.getElementById('image-ai')
    const gallery = document.getElementById('image-gallery')

    const params = new URLSearchParams(new URL(window.location.href).search)
    let intervalId = null
    let progress = 0
    element.innerText = 'Sending Image...'
    const interval = 1000
    const increment = 5
    const maxProgress = 90
    const timeout = setTimeout(() => {
        element.innerText = 'Loading Data...'
        intervalId = setInterval(() => {
            if (progress < maxProgress) {
                progress += increment
                element.textContent = `Loading Data ${progress}%`
            } else {
                clearInterval(intervalId)
            }
        }, interval)
    }, 5000)
    // Perform the fetch request
    fetch(
        'https://a2pejekyml.execute-api.us-east-1.amazonaws.com/PROD/post-image-ai',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: params.get('id'),
                text: document.getElementById('textInputAI').value,
                platform: 'twitter',
            }),
        }
    )
        .then((response) => response.json())

        .then(({ image }) => {
            clearInterval(intervalId)
            clearTimeout(timeout)
            console.log('Success 2:', image)
            document.getElementById('imageDisplay').src =
                'data:image/png;base64,' + image
            const imgElement = document.createElement('img')
            imgElement.src = 'data:image/png;base64,' + image
            imgElement.style.width = '25%'
            imgElement.style.height = '25%'
            gallery.appendChild(imgElement)
            element.innerText = 'Image Sent Successfully'
        })

        .catch((error) => {
            clearInterval(intervalId)
            clearTimeout(timeout)
            console.error('Error:', error)
            element.innerText = 'Error in fetching image'
        })
})
