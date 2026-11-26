package tr.edu.nobel.dto.response;

import tr.edu.nobel.entity.Rol;

public record DemoAccountResponse(Rol rol, Long id, String displayName) { }
