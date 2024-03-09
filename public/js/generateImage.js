document.getElementById('image-trigger').addEventListener('click', function () {
    const element = document.getElementById('image-ai')

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
        'https://a2pejekyml.execute-api.us-east-1.amazonaws.com/post-image-ai',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: document.getElementById('textInputAI').value,
            }),
        }
    )
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
            clearInterval(intervalId)
            clearTimeout(timeout)
            console.log('Success:', buffer)
            const blob = new Blob([buffer], { type: 'image/png' })
            console.log('Success:', blob)
            const imageUrl = URL.createObjectURL(blob)
            console.log('Success 2:', imageUrl)
            element.innerText = 'Image Sent Successfully'
            document.getElementById('imageDisplay').src = imageUrl
        })
        .catch((error) => {
            clearInterval(intervalId)
            clearTimeout(timeout)
            console.error('Error:', error)
            element.innerText = 'Error in fetching image'
        })
})
