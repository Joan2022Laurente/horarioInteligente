package com.utp.horario.infraestructure.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Inyecta automÃ¡ticamente el cÃ³digo del estudiante autenticado,
 * resuelto de forma segura a travÃ©s de los claims del token JWT Bearer.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentStudent {
    /**
     * Si es true, exige que exista una identidad vÃ¡lida o arroja SecurityException.
     */
    boolean required() default true;
}

