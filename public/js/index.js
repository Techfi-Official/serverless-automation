/* eslint-disable no-undef */
document.addEventListener('DOMContentLoaded', function () {
    // Get references to HTML elements
    const regeneratePost = document.getElementById('regenerate_post')
    const textAreas = document.querySelectorAll('.textarea-control')
    const checkboxes = document.querySelectorAll('.checkbox-control')
    const imageContainers = document.querySelectorAll('.image-container')
    const uploadButton = document.getElementById('uploadButton')
    const removeButton = document.getElementById('removeButton')
    const fileInput = document.getElementById('uploadInputImage')

    // Initially disable the regenerate post button
    regeneratePost.ariaDisabled = 'true'
    regeneratePost.disabled = true

    // Helper function to determine if the button should be enabled
    const updateButtonState = () => {
        const isAnyChecked = Array.from(checkboxes).some(
            (checkbox) => checkbox.checked
        )
        const isAnyFull = Array.from(textAreas).some(
            (textArea) => textArea.value.trim() !== ''
        )
        const isEnabled = isAnyChecked && isAnyFull

        regeneratePost.disabled = !isEnabled
        regeneratePost.ariaDisabled = !isEnabled.toString()
    }

    // Add change listener to each checkbox
    checkboxes.forEach((checkbox) =>
        checkbox.addEventListener('change', updateButtonState)
    )

    // Add input listener to each textarea
    textAreas.forEach((textArea) =>
        textArea.addEventListener('input', updateButtonState)
    )

    // Handle image selection (checked-mark)
    imageContainers.forEach((container) => {
        container.addEventListener('click', function () {
            imageContainers.forEach((img) =>
                img.classList.remove('image-selected')
            )
            this.classList.add('image-selected')
            const selectedImageUrl = this.querySelector('img').src
            const img = document.createElement('img')
            const imgToRemove = document.getElementById('dynamicImg')

            if (imgToRemove) {
                document.getElementById('reviewImg')?.removeChild(imgToRemove)
            }

            img.src = selectedImageUrl
            img.alt = 'selected_image'
            img.id = 'dynamicImg'
            img.style.borderRadius = '20px'
            img.style.width = '100%'
            document.getElementById('reviewImg').appendChild(img)
        })
    })

    // Upload button functionality
    uploadButton.addEventListener('click', function () {
        const file = fileInput.files[0]
        const dom = document
            .getElementById('uploadedImage')
            .querySelector('.image-container')
        imageContainers.forEach((container) =>
            container.classList.remove('image-selected')
        )

        if (dom) {
            dom.classList.toggle('image-selected')
        }

        if (file) {
            console.log('File is present:', file)
            const reader = new FileReader()
            const imgParent = document.querySelector(
                '#uploadedImage .image-container img'
            )

            reader.onload = function (e) {
                console.log('FileReader onload triggered', e, 'ozan2')

                if (imgParent) {
                    const imgToRemove = document.getElementById('dynamicImg')

                    if (imgToRemove) {
                        console.log('Image removed 2', imgToRemove)
                        document
                            .getElementById('reviewImg')
                            ?.removeChild(imgToRemove)
                        imgToRemove.removeAttribute('id')
                    }

                    const img = document.createElement('img')
                    img.src = e.target.result
                    img.alt = 'selected_image'
                    img.id = 'dynamicImg'
                    img.style.borderRadius = '20px'
                    img.style.width = '100%'
                    document.getElementById('uploadedImage').style.display =
                        'block'
                    imgParent.src = e.target.result
                    document.getElementById('reviewImg').appendChild(img)
                } else {
                    console.error('Image element not found')
                }
            }

            reader.onerror = function (e) {
                console.error('FileReader error', e)
            }

            reader.readAsDataURL(file) // Trigger the read process
            $('#imageModal').modal('hide')
            console.log('Called readAsDataURL on FileReader')
        }
    })

    // Event listeners for file input
    fileInput.addEventListener('change', fileUploadImage)
    fileInput.addEventListener('dragenter', (e) => e.preventDefault())
    fileInput.addEventListener('dragover', (e) => e.preventDefault())
    fileInput.addEventListener('drop', (e) => {
        e.preventDefault()
        const image = e.originalEvent.dataTransfer.files[0]
        fileUploadImage(image)
    })

    function fileUploadImage() {
        if (this.files && this.files[0]) {
            var reader = new FileReader()
            reader.onload = function (e) {
                $('.image-upload-wrap').hide()

                $('.file-upload-image').attr('src', e.target.result)
                $('.file-upload-content').show()

                $('.image-title').text(event.target.files[0].name)
            }

            reader.readAsDataURL(this.files[0])
        } else {
            removeUpload()
        }
    }
    removeButton.addEventListener('click', removeUpload)

    // Function to remove uploaded image
    function removeUpload() {
        $('.file-upload-input').val('')
        $('.file-upload-content').hide()
        $('.image-upload-wrap').show()
    }

    // Get references to input fields and character count elements
    const textInputIMG = document.getElementById('textInputIMG')
    const textInputPOST = document.getElementById('textInputPOST')
    const textInputIMGValue = document.getElementById('textInputIMGValue')
    const textInputPOSTValue = document.getElementById('textInputPOSTValue')
    const maxLength = 200

    // Validate form input length
    const validateForm = (dataForm, output, err) => {
        // Prevent pasting more than the maxLength
        dataForm.addEventListener('paste', (event) => {
            const clipboardData = event.clipboardData || window.clipboardData
            const pastedText = clipboardData.getData('text/plain')

            if (dataForm.value.length + pastedText.length > 200) {
                dataForm.classList.add('is-invalid')
                document.getElementById(err).innerText =
                    'Cannot type text as it would exceed the 200 character limit!'
                event.preventDefault()
            }
        })

        // Prevent typing more than the maxLength
        dataForm.addEventListener('keydown', (e) => {
            const currentLength = dataForm.value.length
            const isControlKey = [
                'Backspace',
                'Delete',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
            ].includes(e.key)

            if (!isControlKey && currentLength >= maxLength) {
                e.preventDefault()
                dataForm.classList.add('is-invalid')
                document.getElementById(err).innerText =
                    'Cannot type text as it would exceed the 200 character limit!'
            }
        })

        // Calculate the length of the input field
        dataForm.addEventListener('input', (e) => {
            output.innerText = `${e.target.value.length}/${maxLength} characters`
            document.getElementById(err).innerText = null
            dataForm.classList.remove('is-invalid')
        })
    }

    validateForm(textInputIMG, textInputIMGValue, 'textInputIMGErr')
    validateForm(textInputPOST, textInputPOSTValue, 'textInputPOSTErr')

    function alertFire(params) {
        Swal.fire({
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#d33',
            title: params.title,
            imageUrl: params?.imgSrc ?? undefined,
            imageAlt: 'post image',
            text: params.text,
            icon: 'warning',
            confirmButtonText: 'Publish',
            showCancelButton: true,
            reverseButtons: true,
            showLoaderOnConfirm: true,
            width: params?.width ?? '32em',
            imageWidth:
                document.getElementById('dynamicImg')?.clientWidth - 200 ??
                undefined,
            imageHeight:
                document.getElementById('dynamicImg')?.clientHeight - 200 ??
                undefined,
            preConfirm: async () => {
                try {
                    const WebhookUrl = `https://cloud.activepieces.com/api/v1/webhooks/Ts3WLRwxW6kMVAws5bANX`

                    const response = await fetch(WebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(params?.data),
                    })
                    if (!response.ok) {
                        return Swal.showValidationMessage(
                            `${JSON.stringify(await response.json())}`
                        )
                    }
                    return await response.json()
                } catch (error) {
                    Swal.showValidationMessage(`Request failed: ${error}`)
                }
            },
            allowOutsideClick: () => !Swal.isLoading(),
        }).then((result) => {
            if (result.isConfirmed) {
                console.log(result)
                let timerInterval = null
                let percent = 0
                Swal.fire({
                    title: `Posting content to ${params?.subTitle}`,
                    html: `Loading <span id="loading"></span>&#37;`,
                    text: `${result.value}`,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: () => {
                        const timer = document.getElementById('loading')
                        Swal.showLoading()
                        timerInterval = setInterval(() => {
                            percent += 5
                            timer.textContent = percent
                        }, 150)
                    },
                    willClose: () => {
                        clearInterval(timerInterval)
                    },
                    allowOutsideClick: () => !Swal.isLoading(),
                }).then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Post has been saved to twitter',
                        showConfirmButton: false,
                        timer: 1500,
                    })
                })
            }
        })
    }

    document.getElementById('publishPost').addEventListener('click', () =>
        alertFire({
            title: 'Publish the post',
            imgSrc: document.getElementById('dynamicImg')?.src,
            text: 'Are you sure you want to publish this post to twitter?',
            subTitle: 'twitter',
            data: {
                isPublished: true,
                instruction: document.getElementById('edit_tweet').value,
                image: document.getElementById('dynamicImg').src,
            },
        })
    )
    document.getElementById('regenerate_post').addEventListener('click', () =>
        alertFire({
            title: 'Publish the post with a new prompt',
            width: '38em',
            text: 'Are you sure you want to generate a new post?',
            subTitle: 'Email',
            data: {
                isPublished: false,
                instruction: document.getElementById('flexCheckDefault').value,
                imgSrc: document.getElementById('regenerate_post').value,
            },
        })
    )
})
