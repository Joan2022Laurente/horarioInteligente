package com.utp.horario.interfaces.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de descubrimiento RFC 8414 /.well-known.
 * Devuelve 404 Not Found inmediato a clientes como Google Gemini Spark
 * indicando explÃ­citamente que no se requiere autenticaciÃ³n OAuth compleja.
 */
@RestController
@RequestMapping("/.well-known")
public class WellKnownController {

    @GetMapping("/**")
    public ResponseEntity<Void> notFound() {
        return ResponseEntity.notFound().build();
    }
}

