/* eslint-disable no-undef */
document.addEventListener('DOMContentLoaded', function () {
    // Get references to HTML elements
    const regeneratePost = document.getElementById('regeneratePostButton')
    const textAreas = document.querySelectorAll('.textarea-control')
    const regenerateCheckboxes = document.querySelectorAll('.checkbox-control')
    const postPromptCheckbox = document.getElementById('postPromptCheckbox')
    const postPromptCollapse = document.getElementById('collapsePost')
    const imagePromptCheckbox = document.getElementById('imagePromptCheckbox')
    const imageContainers = document.querySelectorAll('.image-container')
    const uploadButton = document.getElementById('uploadButton')
    const removeButton = document.getElementById('removeButton')
    const fileInput = document.getElementById('uploadInputImage')
    const editPostCheckbox = document.getElementById('editPostCheckbox')
    const publishPostButton = document.getElementById('publishPost')
    const regeneratePostButton = document.getElementById('regeneratePostButton')


    // Initially disable the regenerate post button
    regeneratePost.ariaDisabled = 'true'
    regeneratePost.disabled = true

    // if the both publishPostButton and regeneratePostButton are disabled, then show a #postPromptWarning
    const postPromptWarnings = document.getElementsByClassName('postPromptWarning')

    const togglePostPromptWarning = (show) => {
        Array.from(postPromptWarnings).forEach((warning) => {
            warning.style.display = show ? 'block' : 'none'
        })
    }

    const toggleEditTweet = (checkbox) => {
        console.log('ozan toggle edit tweet', checkbox)
        const editTweet = document.getElementById('edit_tweet')
        editTweet.disabled = !checkbox.checked
        if (checkbox.checked) {
            postPromptCheckbox.checked = false
            postPromptCollapse.classList.remove('show')
            // if the image prompt checkbox is not checked, disable the publish post button
            if (!imagePromptCheckbox.checked) {
                publishPostButton.disabled = false
            }
        }
    }

    editPostCheckbox.addEventListener('change', (e) => {
        console.log('ozan edit post checkbox', e.target)
        if (e.target.checked) {
            postPromptCheckbox.checked = false
            postPromptCollapse.classList.add('collapsed')
        }
        toggleEditTweet(e.target)
    })

    const togglePromptCheckbox = (checkbox) => {
        console.log('ozan toggle prompt checkbox', checkbox)
        if (checkbox.checked) {
            editPostCheckbox.checked = false
            const editTweet = document.getElementById('edit_tweet')
            editTweet.disabled = true
        }
    }

    postPromptCheckbox.addEventListener('change', (e) => {
        console.log('ozan post prompt checkbox', e.target)
        if (e.target.checked) {
            editPostCheckbox.checked = false
            const editTweet = document.getElementById('edit_tweet')
            editTweet.disabled = true
        }
        togglePromptCheckbox(e.target)
    })
    
    // Helper function to determine if the button should be enabled
    const updateButtonState = () => {
        const isAnyChecked = Array.from(regenerateCheckboxes).some(
            (checkbox) => checkbox.checked
        )
        const isAnyFull = Array.from(textAreas).some(
            (textArea) => textArea.value.trim() !== ''
        )
        const isEnabled = isAnyChecked && isAnyFull

        togglePostPromptWarning(!isEnabled)

        regeneratePost.disabled = !isEnabled
        regeneratePost.ariaDisabled = !isEnabled.toString()
        // publish post button should be disabled if the post prompt checkbox is checked
        publishPostButton.disabled = isAnyChecked
    }

    // Add change listener to each checkbox
    regenerateCheckboxes.forEach((checkbox) =>
        checkbox.addEventListener('change', updateButtonState)
    )

    // Add input listener to each textarea
    textAreas.forEach((textArea) =>
        textArea.addEventListener('input', updateButtonState)
    )

    // Handle image selection (checked-mark)
    function selectImage(container) {
        imageContainers.forEach(img => img.classList.remove('image-selected'));
        container.classList.add('image-selected');
        
        const selectedImageUrl = container.querySelector('img').src;
        const reviewImg = document.getElementById('reviewImg');
        let dynamicImg = document.getElementById('dynamicImg');

        if (!dynamicImg) {
            dynamicImg = document.createElement('img');
            dynamicImg.id = 'dynamicImg';
            dynamicImg.alt = 'selected_image';
            dynamicImg.style.borderRadius = '20px';
            dynamicImg.style.width = '100%';
            reviewImg.appendChild(dynamicImg);
        }

        dynamicImg.src = selectedImageUrl;
    }

    imageContainers.forEach((container) => {
        container.addEventListener('click', function() {
            selectImage(this);
        });
    });

    // Select the first image by default
    if (imageContainers.length > 0) {
        selectImage(imageContainers[0]);
    }

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
            updateButtonState()
        })
    }

    validateForm(textInputIMG, textInputIMGValue, 'textInputIMGErr')
    validateForm(textInputPOST, textInputPOSTValue, 'textInputPOSTErr')

    function alertFire(params) {
        console.log('ozan alertFire', params)
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
                    const WebhookUrl = '/dev/proxy';
                    const platform = document.getElementById('platform-type').innerText
                    params?.data.platform = platform

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

    // Update the publish post event listener
    publishPostButton.addEventListener('click', () => {
        const selectedImage = document.querySelector('.image-container.image-selected img');
        alertFire({
            title: 'Publish the post',
            imgSrc: selectedImage ? selectedImage.src : '',
            text: 'Are you sure you want to publish this post to twitter?',
            subTitle: 'twitter',
            data: {
                postBody: document.getElementById('edit_tweet').value,
                image: selectedImage ? selectedImage.src : '',
                scheduleID: new URLSearchParams(window.location.search).get('scheduleID'),
                clientID: new URLSearchParams(window.location.search).get('id'),
                isRegenerate: false,
            },
        });
    })

    // TODO: Fix this. There is no difference between the image regenerate text and the post regenerate text
    // TODO: Need to have instructions for body called body_instruction and image called image_instruction
    regeneratePostButton.addEventListener('click', () =>{
        console.log('ozan regeneratePostButton', regeneratePostButton)
        const selectedImage = document.querySelector('.image-container.image-selected img');
        const postBody = document.getElementById('edit_tweet').value
        const postBodyInstruction = document.getElementById('textInputPOST')
        const imageBodyInstruction = document.getElementById('textInputIMG')
        const imsSrc = document.getElementsByClassName('img-thumbnail')
        const imgSrc1 = imsSrc[0].src
        const imgSrc2 = imsSrc[1].src
        const imgSrc3 = imsSrc[2].src

        alertFire({
            title: 'Regenerate post with new prompt',
            width: '38em',
            text: 'Are you sure you want to generate a new post?',
            subTitle: 'Email',
            data: {
                postBody: postBody,
                scheduleID: new URLSearchParams(window.location.search).get('scheduleID'),
                clientID: new URLSearchParams(window.location.search).get('id'),
                isRegenerate: true,
                image: selectedImage ? selectedImage.src : '',
                isImageRegenerate: imagePromptCheckbox.checked,
                isPostRegenerate: postPromptCheckbox.checked,
                bodyInstruction: postBodyInstruction.value,
                imageInstruction: imageBodyInstruction.value,
                imgSrc1: imgSrc1,
                imgSrc2: imgSrc2,
                imgSrc3: imgSrc3,
            },
        })
    })
})
