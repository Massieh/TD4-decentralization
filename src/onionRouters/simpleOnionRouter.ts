import bodyParser from "body-parser";
import express from "express";
import { generateRsaKeyPair, exportPubKey, exportPrvKey } from "../crypto";
import { REGISTRY_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import http from "http";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let encryptedMessage: string | null = null;
  let decryptedMessage: string | null = null;
  let messageDestination: number | null = null;

  const { publicKey, privateKey } = await generateRsaKeyPair();

  const publicKeyBase64 = await exportPubKey(publicKey);
  const privateKeyBase64 = await exportPrvKey(privateKey);

  const registryUrl = `http://localhost:${REGISTRY_PORT}/registerNode`;
  const nodeData = {
    nodeId,
    pubKey: publicKeyBase64
  };

  const postData = JSON.stringify(nodeData);

  const requestOptions = {
    hostname: 'localhost',
    port: REGISTRY_PORT,
    path: '/registerNode',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(requestOptions, (res) => {
    if (res.statusCode === 200) {
      console.log(`Node ${nodeId} registered successfully.`);
    } else {
      console.error(`Failed to register Node ${nodeId}`);
    }
  });

  req.on('error', (e) => {
    console.error(`Problem with registration request: ${e.message}`);
  });

  req.write(postData);
  req.end();

  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: encryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: decryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: messageDestination });
  });


  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKeyBase64 });  
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
