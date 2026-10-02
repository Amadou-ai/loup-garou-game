/**
 * Génère un certificat LOCAL (autorité + certificat serveur) pour pouvoir
 * tester l'audio (WebRTC) depuis un autre appareil : getUserMedia exige un
 * contexte sécurisé (HTTPS).
 *
 * Usage :
 *   npm install
 *   node scripts/make-certs.js
 *
 * Génère dans ./certs :
 *   rootCA.crt / rootCA.pem  -> à INSTALLER comme autorité de certification
 *                               sur le PC ET sur le téléphone
 *   server.key / server.crt  -> utilisés automatiquement par server.js (HTTPS)
 *
 * Le certificat couvre : localhost, 127.0.0.1 et toutes les IP locales du PC.
 */
const forge = require("node-forge");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CERT_DIR = path.join(__dirname, "..", "certs");

function lanIPv4() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

const ipAddresses = ["127.0.0.1", ...lanIPv4()];
const dnsNames = ["localhost"];

// --- Autorité de certification (CA) locale ---
const caKeys = forge.pki.rsa.generateKeyPair(2048);
const caCert = forge.pki.createCertificate();
caCert.publicKey = caKeys.publicKey;
caCert.serialNumber = "01";
caCert.validity.notBefore = new Date();
caCert.validity.notAfter = new Date();
caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10);
const caAttrs = [{ name: "commonName", value: "Loup-Garou Local CA" }];
caCert.setSubject(caAttrs);
caCert.setIssuer(caAttrs);
caCert.setExtensions([
  { name: "basicConstraints", cA: true },
  { name: "keyUsage", keyCertSign: true, cRLSign: true, digitalSignature: true },
  { name: "subjectKeyIdentifier" },
]);
caCert.sign(caKeys.privateKey, forge.md.sha256.create());

// --- Certificat serveur signé par le CA ---
const srvKeys = forge.pki.rsa.generateKeyPair(2048);
const srvCert = forge.pki.createCertificate();
srvCert.publicKey = srvKeys.publicKey;
srvCert.serialNumber = "02";
srvCert.validity.notBefore = new Date();
srvCert.validity.notAfter = new Date();
srvCert.validity.notAfter.setFullYear(srvCert.validity.notBefore.getFullYear() + 10);
srvCert.setSubject([{ name: "commonName", value: ipAddresses[1] || "localhost" }]);
srvCert.setIssuer(caCert.subject.attributes);
srvCert.setExtensions([
  { name: "basicConstraints", cA: false },
  { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
  { name: "extKeyUsage", serverAuth: true },
  {
    name: "subjectAltName",
    altNames: [
      ...dnsNames.map((value) => ({ type: 2, value })),
      ...ipAddresses.map((ip) => ({ type: 7, ip })),
    ],
  },
]);
srvCert.sign(caKeys.privateKey, forge.md.sha256.create());

fs.mkdirSync(CERT_DIR, { recursive: true });
const caPem = forge.pki.certificateToPem(caCert);
fs.writeFileSync(path.join(CERT_DIR, "rootCA.pem"), caPem);
fs.writeFileSync(path.join(CERT_DIR, "rootCA.crt"), caPem);
fs.writeFileSync(path.join(CERT_DIR, "server.key"), forge.pki.privateKeyToPem(srvKeys.privateKey));
fs.writeFileSync(path.join(CERT_DIR, "server.crt"), forge.pki.certificateToPem(srvCert));

console.log("✅ Certificats générés dans ./certs");
console.log("   - rootCA.crt : à installer comme autorité sur le PC et le téléphone");
console.log("   - server.key / server.crt : utilisés par server.js");
console.log("Noms couverts :", [...dnsNames, ...ipAddresses].join(", "));
