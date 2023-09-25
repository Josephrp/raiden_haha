const screenshot = require('screenshot-desktop');
const { OpenAI } = require('openai')
const { createWorker } = require('tesseract.js')
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const sound = require('sound-play')
const path = require('path')
const fs = require('fs');


const OPENAI_API_KEY = `YOUR_OPENAI_KEY`
const INTERVAL_SECS = 60 * 1



const client = new TextToSpeechClient({
    keyFilename: 'google_service_key.json',
});
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});
let worker

async function synthesizeText(text) {
    console.log('> tts')
    const request = {
        input: {
            text
        },
        voice: {
            languageCode: 'en-US',
            ssmlGender: 'NEUTRAL',
            speakingRate: 1.5,
        },
        audioConfig: {
            audioEncoding: 'MP3'
        },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        const outfile = `${Date.now()}.mp3`
        const writeFile = fs.promises.writeFile(outfile, response.audioContent);
        await writeFile;
        console.log('Audio content written to file: output.mp3');
        return outfile
    } catch (err) {
        console.error('Error:', err);
    }
}

async function ocr(url) {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const {
        data: {
            text
        }
    } = await worker.recognize(url);
    console.log(text);
    await worker.terminate();
    return text.trim()
}
async function screenjoke() {
    await screenshot({
        filename: 'cap.png'
    })
    console.log('screened')
    worker = await createWorker({
        logger: m => true
    });
    const text = await ocr('cap.png')
    console.log(text)
    console.log('--- joke : --------------------------------\n\n')
    const gptPrompt = {
        model: `gpt-3.5-turbo-16k`,
        messages: [{
                role: `system`,
                content: `you are a hilarious stand up comedian, like bill burr`
            },
            {
                role: `user`,
                content: `here is the context obtained from the user screen:\n\n---\n${text.trim()}\n---\n\n` +
                    `Make a humorous statement relative to the provided data. ` +
                    `you can mix between bill burr type jokes, absurd louis ck type jokes, and merge with some technical knowledge jokes. ` +
                    `your joke should be in a single paragraph. prefer sarcastic, edgy sh**head jokes rather than boring ones. ` +
                    `Be extremely creative, do the best you can - you are a comedy genius !\n\nyour take:`
            },
        ],
        stream: true,
    }
    let completion = ''
    const stream = await openai.chat.completions.create({
        ...gptPrompt,
        stream: true
    })
    for await (const part of stream) {
        process.stdout.write(part.choices[0]?.delta?.content || '');
        try {
            completion += part.choices[0]?.delta?.content || ''
        } catch (e) {
            false
        }
    }
    const outfile = await synthesizeText(completion)

    sound.play(path.join(path.resolve(), outfile));

}

async function main() {
    await new Promise(r => setTimeout(r, 2000));
    while (true) {
        screenjoke()
        await new Promise(r => setTimeout(r, INTERVAL_SECS * 1e3));
    }
}

main()