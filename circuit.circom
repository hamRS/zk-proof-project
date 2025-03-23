pragma circom 2.0.0;

/*
  Circuito que verifica la operación c = (a² + b²) % p
  - a,b: números secretos (privados)
  - p: número primo público
  - c: resultado público
*/

// Plantilla para calcular el cuadrado de un número
template Square() {
    signal input in;
    signal output out;
    
    out <== in * in;
}

// Plantilla para verificar que un valor está en rango [0, p-1]
template CheckRange(p) {
    signal input in;
    
    // Verificamos que in está en el rango [0, p-1]
    signal aux;
    aux <-- p - 1 - in;
    
    // Si in está en rango [0, p-1], entonces aux*aux+aux = 0 solo si aux es 0 o -1
    // Esto funciona porque p - 1 - in >= 0 cuando in <= p-1
    aux * (aux + 1) === 0;
}

// Plantilla para calcular el módulo
template Modulo(p) {
    signal input in;
    signal output out;
    
    // Calculamos el módulo usando asignación
    signal q;
    q <-- in \ p;  // División entera (el operador "\" es para división entera)
    out <-- in - q * p;
    
    // Verificamos que out está en el rango [0, p-1]
    component range = CheckRange(p);
    range.in <== out;
    
    // Restricción que garantiza que out = in - q*p (definición del módulo)
    in === out + q * p;
}

// Plantilla principal para la operación completa
template SquareSum(p) {
    // Declaramos entradas privadas
    signal input a;
    signal input b;
    
    // Declaramos salida pública
    signal output c;
    
    // Verificamos que a y b están en el rango [0, p-1]
    component rangeA = CheckRange(p);
    component rangeB = CheckRange(p);
    rangeA.in <== a;
    rangeB.in <== b;
    
    // Componentes para calcular los cuadrados
    component squareA = Square();
    component squareB = Square();
    squareA.in <== a;
    squareB.in <== b;
    
    // Calculamos la suma de cuadrados
    signal sumSquares;
    sumSquares <== squareA.out + squareB.out;
    
    // Calculamos el módulo de la suma
    component modulo = Modulo(p);
    modulo.in <== sumSquares;
    c <== modulo.out;
}

// Componente principal
component main = SquareSum(17);