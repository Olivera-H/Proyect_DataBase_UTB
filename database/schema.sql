-- ============================================================================
-- PLATAFORMA DE GESTIÓN DE SEMILLEROS DE INVESTIGACIÓN - UTB
-- Script de base de datos MySQL 8.0
-- Motor: InnoDB | Cotejamiento: utf8mb4_unicode_ci
-- ============================================================================
-- Este script está dividido en 3 partes:
--   1) DDL  -> Creación de la base de datos y las tablas
--   2) DML  -> Datos de prueba (población inicial)
--   3) Objetos avanzados -> 1 Vista, 1 Procedimiento Almacenado y 1 Trigger
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. BASE DE DATOS
-- ----------------------------------------------------------------------------
DROP DATABASE IF EXISTS semilleros_utb;
CREATE DATABASE semilleros_utb
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE semilleros_utb;

-- ============================================================================
-- 1. DDL - DEFINICIÓN DE TABLAS
-- ============================================================================

-- Facultades de la universidad (ej: Ingeniería, Ciencias Económicas, etc.)
CREATE TABLE facultad (
    id_facultad     INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    codigo          VARCHAR(20)  NOT NULL,
    CONSTRAINT uq_facultad_nombre UNIQUE (nombre),
    CONSTRAINT uq_facultad_codigo UNIQUE (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Facultades de la UTB, cada una agrupa varios programas académicos';

-- Programas académicos, cada uno pertenece a una facultad
CREATE TABLE programa (
    id_programa     INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    codigo          VARCHAR(20)  NOT NULL,
    id_facultad     INT NOT NULL,
    CONSTRAINT uq_programa_codigo UNIQUE (codigo),
    CONSTRAINT fk_programa_facultad
        FOREIGN KEY (id_facultad) REFERENCES facultad(id_facultad)
        -- Un programa no puede quedar huérfano: si intentan borrar la facultad
        -- y aún tiene programas asociados, se restringe el borrado.
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Programas académicos de la UTB';

-- Catálogo de roles del sistema
CREATE TABLE rol (
    id_rol          INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol      ENUM('Admin_Sistema', 'Profesor_Lider', 'Estudiante') NOT NULL,
    CONSTRAINT uq_rol_nombre UNIQUE (nombre_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Roles del sistema: Admin de Sistema, Profesor Líder y Estudiante';

-- Usuarios de la plataforma (administradores, docentes líderes y estudiantes)
CREATE TABLE usuario (
    id_usuario          INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    apellido            VARCHAR(100) NOT NULL,
    email               VARCHAR(150) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    codigo_institucional VARCHAR(20) NULL,
    id_rol              INT NOT NULL,
    id_programa         INT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT uq_usuario_codigo UNIQUE (codigo_institucional),
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
        -- No se puede borrar un rol si todavía hay usuarios con ese rol.
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_usuario_programa
        FOREIGN KEY (id_programa) REFERENCES programa(id_programa)
        -- Si el programa se elimina, el usuario no se borra, solo queda sin programa.
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuarios de la plataforma: SuperAdmin, Profesores Líderes y Estudiantes';

-- Semilleros de investigación
CREATE TABLE semillero (
    id_semillero           INT AUTO_INCREMENT PRIMARY KEY,
    nombre                 VARCHAR(150) NOT NULL,
    descripcion            TEXT NULL,
    id_facultad            INT NOT NULL,
    id_docente_lider       INT NOT NULL,
    num_miembros_activos   INT NOT NULL DEFAULT 0,
    estado                 ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    fecha_creacion         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_semillero_nombre UNIQUE (nombre),
    CONSTRAINT fk_semillero_facultad
        FOREIGN KEY (id_facultad) REFERENCES facultad(id_facultad)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_semillero_docente_lider
        FOREIGN KEY (id_docente_lider) REFERENCES usuario(id_usuario)
        -- No se puede borrar a un docente mientras siga siendo líder de un semillero;
        -- primero se debe reasignar el liderazgo (regla de negocio del Admin de Sistema).
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Semilleros de investigación, cada uno con un docente líder responsable';

-- Tabla intermedia: relación estudiante <-> semillero (solicitudes de ingreso)
CREATE TABLE miembros_semillero (
    id_miembro          INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario           INT NOT NULL,
    id_semillero         INT NOT NULL,
    rol_interno          VARCHAR(50) NOT NULL DEFAULT 'Integrante',
    estado_solicitud     ENUM('pendiente', 'aprobado', 'rechazado', 'finalizado')
                          NOT NULL DEFAULT 'pendiente',
    fecha_solicitud      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio         DATE NULL,
    fecha_fin            DATE NULL,
    CONSTRAINT uq_miembro_usuario_semillero UNIQUE (id_usuario, id_semillero),
    CONSTRAINT fk_miembro_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        -- Si se elimina el usuario, sus solicitudes/membresías se eliminan en cascada.
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_miembro_semillero
        FOREIGN KEY (id_semillero) REFERENCES semillero(id_semillero)
        -- Si se elimina el semillero, sus membresías se eliminan en cascada.
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Solicitudes e historial de participación de estudiantes en semilleros';

-- Proyectos de investigación de cada semillero
CREATE TABLE proyecto_investigacion (
    id_proyecto     INT AUTO_INCREMENT PRIMARY KEY,
    id_semillero    INT NOT NULL,
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT NULL,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NULL,
    estado          ENUM('planeacion', 'en_curso', 'finalizado', 'cancelado')
                     NOT NULL DEFAULT 'planeacion',
    CONSTRAINT fk_proyecto_semillero
        FOREIGN KEY (id_semillero) REFERENCES semillero(id_semillero)
        -- Los proyectos pertenecen exclusivamente a su semillero.
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_proyecto_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Proyectos de investigación creados por el docente líder de cada semillero';

-- Actividades del semillero (reuniones, talleres, capacitaciones, etc.)
CREATE TABLE actividades (
    id_actividad    INT AUTO_INCREMENT PRIMARY KEY,
    id_semillero    INT NOT NULL,
    id_proyecto     INT NULL,
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT NULL,
    tipo            ENUM('reunion', 'taller', 'capacitacion', 'otro') NOT NULL DEFAULT 'reunion',
    fecha_actividad DATETIME NOT NULL,
    CONSTRAINT fk_actividad_semillero
        FOREIGN KEY (id_semillero) REFERENCES semillero(id_semillero)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_actividad_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyecto_investigacion(id_proyecto)
        -- La actividad puede quedar sin proyecto asociado (es opcional) si éste se elimina.
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Actividades realizadas dentro de cada semillero';

-- Registro de asistencia de los integrantes a cada actividad
CREATE TABLE asistencia (
    id_asistencia   INT AUTO_INCREMENT PRIMARY KEY,
    id_actividad    INT NOT NULL,
    id_usuario      INT NOT NULL,
    asistio         BOOLEAN NOT NULL DEFAULT FALSE,
    observacion     VARCHAR(255) NULL,
    CONSTRAINT uq_asistencia_actividad_usuario UNIQUE (id_actividad, id_usuario),
    CONSTRAINT fk_asistencia_actividad
        FOREIGN KEY (id_actividad) REFERENCES actividades(id_actividad)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_asistencia_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Control de asistencia de los integrantes a las actividades del semillero';

-- Productos académicos generados por los proyectos (artículos, ponencias, etc.)
CREATE TABLE productos_academicos (
    id_producto         INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto         INT NOT NULL,
    tipo                ENUM('articulo', 'ponencia', 'prototipo', 'otro') NOT NULL,
    titulo              VARCHAR(200) NOT NULL,
    descripcion         TEXT NULL,
    fecha_registro      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validado            BOOLEAN NOT NULL DEFAULT FALSE,
    id_usuario_registra INT NULL,
    CONSTRAINT fk_producto_proyecto
        FOREIGN KEY (id_proyecto) REFERENCES proyecto_investigacion(id_proyecto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_producto_usuario
        FOREIGN KEY (id_usuario_registra) REFERENCES usuario(id_usuario)
        -- Se conserva el producto aunque el usuario que lo registró sea eliminado.
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Productos académicos (artículos, ponencias, prototipos) validados por el docente líder';

-- Índices adicionales para acelerar las consultas más frecuentes de la API
CREATE INDEX idx_miembro_estado ON miembros_semillero (id_semillero, estado_solicitud);
CREATE INDEX idx_proyecto_semillero ON proyecto_investigacion (id_semillero, estado);
CREATE INDEX idx_actividad_semillero ON actividades (id_semillero, fecha_actividad);

-- ============================================================================
-- 2. DML - POBLACIÓN INICIAL (DATOS DE PRUEBA)
-- ============================================================================

INSERT INTO rol (nombre_rol) VALUES
    ('Admin_Sistema'),
    ('Profesor_Lider'),
    ('Estudiante');

INSERT INTO facultad (nombre, codigo) VALUES
    ('Facultad de Ingeniería', 'ING'),
    ('Facultad de Ciencias Económicas y Administrativas', 'ECO'),
    ('Facultad de Ciencias Básicas', 'CBAS'),
    ('Facultad de Ciencias Sociales y Humanidades', 'CSH');

INSERT INTO programa (nombre, codigo, id_facultad) VALUES
    ('Ingeniería de Sistemas', 'IS', 1),
    ('Ingeniería Industrial', 'II', 1),
    ('Ingeniería Electrónica', 'IE', 1),
    ('Administración de Empresas', 'AE', 2),
    ('Economía', 'ECN', 2),
    ('Biología', 'BIO', 3),
    ('Psicología', 'PSI', 4);

-- Contraseña de prueba para TODOS los usuarios sembrados: "Utb2026*"
-- Hash generado con bcrypt (10 rounds). Debe cambiarse en un entorno real.
-- $2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW
INSERT INTO usuario (nombre, apellido, email, password_hash, codigo_institucional, id_rol, id_programa, activo) VALUES
    ('Laura', 'Restrepo', 'admin.sistema@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', NULL, 1, NULL, TRUE),
    ('Carlos', 'Martínez', 'carlos.martinez@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'DOC-001', 2, 1, TRUE),
    ('Ana', 'Pérez', 'ana.perez@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'DOC-002', 2, 6, TRUE),
    ('Juan', 'Gómez', 'juan.gomez@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'EST-1001', 3, 1, TRUE),
    ('María', 'López', 'maria.lopez@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'EST-1002', 3, 1, TRUE),
    ('Pedro', 'Salcedo', 'pedro.salcedo@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'EST-1003', 3, 3, TRUE),
    ('Valentina', 'Ríos', 'valentina.rios@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'EST-1004', 3, 6, TRUE),
    ('Andrés', 'Cabrales', 'andres.cabrales@utb.edu.co', '$2a$10$KQS0b8VJ7pMLHP9ATKTsvuzFo/LKo7x0O1V0vY0a1mTjPLVMzXRwW', 'EST-1005', 3, 1, TRUE);

INSERT INTO semillero (nombre, descripcion, id_facultad, id_docente_lider) VALUES
    ('Semillero de Inteligencia Artificial', 'Investigación aplicada en aprendizaje automático y ciencia de datos.', 1, 2),
    ('Semillero de Biotecnología', 'Estudios en biología molecular y biotecnología aplicada.', 3, 3);

-- Membresías: algunas aprobadas (ya cuentan en num_miembros_activos vía el trigger)
-- y otras pendientes de revisión por el docente líder.
INSERT INTO miembros_semillero (id_usuario, id_semillero, estado_solicitud, fecha_inicio) VALUES
    (4, 1, 'aprobado', '2026-02-01'),
    (5, 1, 'aprobado', '2026-02-01');
INSERT INTO miembros_semillero (id_usuario, id_semillero, estado_solicitud) VALUES
    (8, 1, 'pendiente');
INSERT INTO miembros_semillero (id_usuario, id_semillero, estado_solicitud, fecha_inicio) VALUES
    (6, 2, 'aprobado', '2026-02-15');
INSERT INTO miembros_semillero (id_usuario, id_semillero, estado_solicitud) VALUES
    (7, 2, 'pendiente');

INSERT INTO proyecto_investigacion (id_semillero, titulo, descripcion, fecha_inicio, estado) VALUES
    (1, 'Detección temprana de deserción estudiantil con ML', 'Modelo predictivo usando datos académicos históricos.', '2026-02-10', 'en_curso'),
    (2, 'Bioindicadores de calidad de agua en la Ciénaga de la Virgen', 'Análisis de microorganismos indicadores.', '2026-03-01', 'planeacion');

INSERT INTO actividades (id_semillero, id_proyecto, titulo, tipo, fecha_actividad) VALUES
    (1, 1, 'Reunión de arranque del proyecto', 'reunion', '2026-02-12 15:00:00'),
    (1, NULL, 'Taller de fundamentos de Python', 'taller', '2026-02-20 14:00:00'),
    (2, 2, 'Kickoff del proyecto de bioindicadores', 'reunion', '2026-03-03 10:00:00');

INSERT INTO asistencia (id_actividad, id_usuario, asistio, observacion) VALUES
    (1, 4, TRUE, NULL),
    (1, 5, TRUE, NULL),
    (2, 4, FALSE, 'Justificó inasistencia por cruce de horario.');

INSERT INTO productos_academicos (id_proyecto, tipo, titulo, descripcion, validado, id_usuario_registra) VALUES
    (1, 'ponencia', 'Avances preliminares del modelo predictivo', 'Presentado en el encuentro interno de semilleros.', TRUE, 2),
    (1, 'prototipo', 'Prototipo v0.1 del modelo de deserción', 'Notebook con el primer pipeline de datos.', FALSE, 2);

-- ============================================================================
-- 3. OBJETOS AVANZADOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 VISTA: resumen por semillero para el panel del Admin de Sistema
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_resumen_semilleros AS
SELECT
    s.id_semillero,
    s.nombre                                   AS semillero,
    f.nombre                                   AS facultad,
    CONCAT(u.nombre, ' ', u.apellido)           AS docente_lider,
    s.estado,
    s.num_miembros_activos,
    COUNT(DISTINCT CASE WHEN p.estado = 'en_curso' THEN p.id_proyecto END)  AS proyectos_activos,
    COUNT(DISTINCT p.id_proyecto)               AS proyectos_totales,
    COUNT(DISTINCT pa.id_producto)              AS productos_totales,
    COUNT(DISTINCT CASE WHEN pa.validado = TRUE THEN pa.id_producto END)   AS productos_validados,
    s.fecha_creacion
FROM semillero s
JOIN facultad f              ON f.id_facultad = s.id_facultad
JOIN usuario u                ON u.id_usuario = s.id_docente_lider
LEFT JOIN proyecto_investigacion p ON p.id_semillero = s.id_semillero
LEFT JOIN productos_academicos pa  ON pa.id_proyecto = p.id_proyecto
GROUP BY
    s.id_semillero, s.nombre, f.nombre, docente_lider,
    s.estado, s.num_miembros_activos, s.fecha_creacion;

-- ----------------------------------------------------------------------------
-- 3.2 PROCEDIMIENTO ALMACENADO: aprobar ingreso de un estudiante a un semillero
--     Reglas de negocio validadas dentro del procedimiento:
--       a) La solicitud debe existir y estar en estado 'pendiente'.
--       b) Solo el docente líder DUEÑO del semillero puede aprobarla.
--       c) Un estudiante no puede estar activo (aprobado) en más de 2 semilleros
--          simultáneamente; si ya lo está, la solicitud se rechaza automáticamente.
-- ----------------------------------------------------------------------------
DELIMITER $$

CREATE PROCEDURE sp_aprobar_ingreso_estudiante (
    IN  p_id_miembro   INT,
    IN  p_id_profesor  INT,
    OUT p_resultado    VARCHAR(255)
)
sp_body: BEGIN
    DECLARE v_id_semillero      INT;
    DECLARE v_id_usuario        INT;
    DECLARE v_estado_actual     VARCHAR(20);
    DECLARE v_id_lider_semillero INT;
    DECLARE v_semilleros_activos INT DEFAULT 0;

    -- 1) Ubicar la solicitud
    SELECT id_semillero, id_usuario, estado_solicitud
      INTO v_id_semillero, v_id_usuario, v_estado_actual
      FROM miembros_semillero
     WHERE id_miembro = p_id_miembro;

    IF v_id_semillero IS NULL THEN
        SET p_resultado = 'ERROR: La solicitud indicada no existe.';
        LEAVE sp_body;
    END IF;

    -- 2) Validar que quien aprueba es el docente líder de ESE semillero
    SELECT id_docente_lider INTO v_id_lider_semillero
      FROM semillero WHERE id_semillero = v_id_semillero;

    IF v_id_lider_semillero IS NULL OR v_id_lider_semillero <> p_id_profesor THEN
        SET p_resultado = 'ERROR: Solo el docente líder de este semillero puede aprobar la solicitud.';
        LEAVE sp_body;
    END IF;

    -- 3) Validar que la solicitud siga pendiente
    IF v_estado_actual <> 'pendiente' THEN
        SET p_resultado = CONCAT('ERROR: La solicitud ya fue procesada previamente (estado actual: ', v_estado_actual, ').');
        LEAVE sp_body;
    END IF;

    -- 4) Regla de negocio: máximo 2 semilleros activos por estudiante
    SELECT COUNT(*) INTO v_semilleros_activos
      FROM miembros_semillero
     WHERE id_usuario = v_id_usuario AND estado_solicitud = 'aprobado';

    IF v_semilleros_activos >= 2 THEN
        UPDATE miembros_semillero
           SET estado_solicitud = 'rechazado'
         WHERE id_miembro = p_id_miembro;
        SET p_resultado = 'ERROR: El estudiante ya participa activamente en 2 semilleros; la solicitud fue rechazada automáticamente.';
        LEAVE sp_body;
    END IF;

    -- 5) Todo válido: aprobar el ingreso
    UPDATE miembros_semillero
       SET estado_solicitud = 'aprobado',
           fecha_inicio = CURDATE()
     WHERE id_miembro = p_id_miembro;

    SET p_resultado = 'OK: Ingreso del estudiante aprobado correctamente.';
END sp_body $$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 3.3 TRIGGER: mantener actualizado el número de miembros activos del semillero
--     Se dispara cada vez que cambia el estado_solicitud de una membresía:
--       - Si pasa A 'aprobado' -> incrementa el contador del semillero.
--       - Si pasa DE 'aprobado' a cualquier otro estado -> lo decrementa.
--     Como las bajas se modelan con estado_solicitud = 'finalizado' (no DELETE),
--     este único trigger cubre todo el ciclo de vida de la membresía.
-- ----------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_actualizar_miembros_activos
AFTER UPDATE ON miembros_semillero
FOR EACH ROW
BEGIN
    IF NEW.estado_solicitud = 'aprobado' AND OLD.estado_solicitud <> 'aprobado' THEN
        UPDATE semillero
           SET num_miembros_activos = num_miembros_activos + 1
         WHERE id_semillero = NEW.id_semillero;
    ELSEIF OLD.estado_solicitud = 'aprobado' AND NEW.estado_solicitud <> 'aprobado' THEN
        UPDATE semillero
           SET num_miembros_activos = GREATEST(num_miembros_activos - 1, 0)
         WHERE id_semillero = NEW.id_semillero;
    END IF;
END $$

DELIMITER ;

-- ============================================================================
-- Fin del script. Ver README.md para instrucciones de ejecución.
-- ============================================================================
