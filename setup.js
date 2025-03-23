// Guardamos este archivo como setup.js

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Iniciando el proceso completo de compilación y prueba del circuito...");

    // 1. Compilar el circuito (asumiendo que ya has compilado el circuito con circom)
    console.log("Asumiendo que el circuito ya está compilado... Si no, ejecuta:");
    console.log("circom circuit.circom --r1cs --wasm --sym");

    // 2. Iniciar una ceremonia de Powers of Tau (fase 1)
    console.log("Iniciando ceremonia Powers of Tau...");
    await snarkjs.powersOfTau.newAccumulator(12, "pot12_0000.ptau");
    await snarkjs.powersOfTau.contribute("pot12_0000.ptau", "pot12_0001.ptau", "Primera contribución", "Entropy1");

    // 3. Preparar la fase 2
    console.log("Preparando la fase 2...");
    await snarkjs.powersOfTau.preparePhase2("pot12_0001.ptau", "pot12_final.ptau");

    // 4. Generar los archivos de claves para el circuito
    console.log("Generando archivos de claves...");
    await snarkjs.zKey.newZKey("circuit.r1cs", "pot12_final.ptau", "circuit_0000.zkey");
    await snarkjs.zKey.contribute("circuit_0000.zkey", "circuit_0001.zkey", "Segunda contribución", "Entropy2");
    await snarkjs.zKey.exportVerificationKey("circuit_0001.zkey", "verification_key.json");

    // 5. Crear un archivo de entrada con los valores de prueba
    const input = {
      "a": 3,
      "b": 4
    };
    fs.writeFileSync("input.json", JSON.stringify(input), "utf-8");
    console.log("Archivo de entrada creado con a=3, b=4");

    // 6. Generar una prueba
    console.log("Generando prueba...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input, 
      "circuit_js/circuit.wasm", 
      "circuit_0001.zkey"
    );

    fs.writeFileSync("proof.json", JSON.stringify(proof, null, 1), "utf-8");
    fs.writeFileSync("public.json", JSON.stringify(publicSignals, null, 1), "utf-8");
    console.log("Prueba generada y guardada en proof.json");
    console.log("Señales públicas guardadas en public.json");

    // 7. Verificar la prueba
    console.log("Verificando la prueba...");
    const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf-8"));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    console.log("Resultado de la verificación:", verified);

    // 8. Generar un verificador en Solidity
    console.log("Generando verificador en Solidity...");
    const solidityVerifier = await snarkjs.zKey.exportSolidityVerifier("circuit_0001.zkey", {
      verifyingKeyPath: "verification_key.json",
      verifierPath: "verifier.sol"
    });
    fs.writeFileSync("verifier.sol", solidityVerifier, "utf-8");

    // 9. Generar un verificador para Node.js y navegador
    console.log("Generando verificador para Node.js y navegador...");
    const verifierCode = await snarkjs.zKey.exportSolidityCalldata(publicSignals, proof);
    fs.writeFileSync("calldata.txt", verifierCode, "utf-8");

    // 10. Crear un archivo de JavaScript para verificar en el navegador
    const browserVerifier = `
    // Guardar como browser-verifier.js
    async function verifyProof(proof, publicSignals) {
      const snarkjs = window.snarkjs;
      const vKey = ${JSON.stringify(vKey, null, 2)};
      try {
        const result = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        return result;
      } catch (error) {
        console.error("Error en la verificación:", error);
        return false;
      }
    }

    // Ejemplo de uso:
    async function runDemo() {
      const proof = ${JSON.stringify(proof, null, 2)};
      const publicSignals = ${JSON.stringify(publicSignals, null, 2)};
      
      const result = await verifyProof(proof, publicSignals);
      document.getElementById("result").textContent = 
        result ? "¡Verificación exitosa! La prueba es válida." : "Verificación fallida. La prueba no es válida.";
    }
    `;
    fs.writeFileSync("browser-verifier.js", browserVerifier, "utf-8");

    // 11. Crear un archivo HTML de ejemplo para usar el verificador en el navegador
    const htmlExample = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificador de Pruebas ZK</title>
      <script src="https://cdn.jsdelivr.net/npm/snarkjs@0.7.0/build/snarkjs.min.js"></script>
      <script src="browser-verifier.js"></script>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        button { padding: 10px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
        #result { margin-top: 20px; padding: 15px; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <h1>Verificador de Pruebas de Conocimiento Cero</h1>
      <p>Este demo verifica una prueba precompilada para la operación c = (a² + b²) % p</p>
      <p>Valores utilizados: a=3, b=4, p=17</p>
      <p>El resultado esperado es c = (3² + 4²) % 17 = (9 + 16) % 17 = 25 % 17 = 8</p>
      
      <button onclick="runDemo()">Verificar Prueba</button>
      
      <div id="result">Pulse el botón para verificar la prueba.</div>
    </body>
    </html>
    `;
    fs.writeFileSync("index.html", htmlExample, "utf-8");

    // 12. Crear un verificador para Node.js
    const nodeVerifier = `
    // Guardar como node-verifier.js
    const snarkjs = require("snarkjs");
    const fs = require("fs");

    async function verifyProof() {
      try {
        // Cargar la prueba y las señales públicas
        const proof = JSON.parse(fs.readFileSync("proof.json", "utf-8"));
        const publicSignals = JSON.parse(fs.readFileSync("public.json", "utf-8"));
        const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf-8"));
        
        // Verificar la prueba
        const result = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        console.log("Valores utilizados: a=3, b=4, p=17");
        console.log("Resultado esperado: c = (3² + 4²) % 17 = (9 + 16) % 17 = 25 % 17 = 8");
        console.log("Valor público obtenido:", publicSignals[0]);
        console.log("Resultado de la verificación:", result ? "¡Éxito!" : "Fallo");
        
        return result;
      } catch (error) {
        console.error("Error en la verificación:", error);
        return false;
      }
    }

    // Ejecutar la verificación
    verifyProof().then(() => {
      console.log("Proceso de verificación completado");
    });
    `;
    fs.writeFileSync("node-verifier.js", nodeVerifier, "utf-8");

    console.log("\n=== PROCESO COMPLETADO CON ÉXITO ===");
    console.log("Archivos generados:");
    console.log("- Prueba: proof.json");
    console.log("- Señales públicas: public.json");
    console.log("- Verificador Solidity: verifier.sol");
    console.log("- Verificador para navegador: browser-verifier.js e index.html");
    console.log("- Verificador para Node.js: node-verifier.js");
    console.log("\nPara ejecutar la verificación en Node.js:");
    console.log("$ node node-verifier.js");
    console.log("\nPara ejecutar la verificación en un navegador:");
    console.log("Abra index.html en su navegador favorito");

  } catch (error) {
    console.error("Error en el proceso:", error);
  }
}

main().then(() => {
  console.log("Proceso finalizado");
});