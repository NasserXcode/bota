import childProcess  from 'child_process'
import express from 'express'

const app = express();
const port = 3000;
const server = app.listen(process.env.PORT || port, () => console.log(`listening on port ${port} or ${process.env.PORT}`));


app.get('/', (req, res) => {
    res.send('Hello World!');
}
);


// run a slahbot.js file in a child process

 const child = childProcess.fork('./slashbot.js');

 child.on('message', (message) => {
        console.log(message);
    }
);