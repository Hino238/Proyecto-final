import ikpy.chain
import ikpy.link
import numpy as np

# Definición del brazo con tus medidas exactas en milímetros.
# Asumimos una posición inicial (0 grados) donde el robot apunta completamente hacia arriba (Eje Z).
brazo_6dof = ikpy.chain.Chain(name='brazo_ik', links=[
    ikpy.link.OriginLink(),
    
    # 1. Base (Servo 1): Gira sobre el eje Z (Paneo)
    ikpy.link.URDFLink(
      name="Base",
      origin_translation=[0, 0, 0],
      origin_orientation=[0, 0, 0],
      rotation=[0, 0, 1], 
      bounds=(0, np.pi) # Límites mecánicos: 0 a 180 grados
    ),
    
    # 2. Hombro (Servo 2): 61 mm por encima de la base. Gira en Y (Cabeceo)
    ikpy.link.URDFLink(
      name="Hombro",
      origin_translation=[0, 0, 61], 
      origin_orientation=[0, 0, 0],
      rotation=[0, 1, 0],
      bounds=(0, np.pi)
    ),
    
    # 3. Codo (Servo 3): A 111 mm del hombro. Gira en Y
    ikpy.link.URDFLink(
      name="Codo",
      origin_translation=[0, 0, 111],
      origin_orientation=[0, 0, 0],
      rotation=[0, 1, 0],
      bounds=(0, np.pi)
    ),
    
    # 4. Muñeca Pitch (Servo 4): A 92 mm del codo. Gira en Y
    ikpy.link.URDFLink(
      name="Muneca_Pitch",
      origin_translation=[0, 0, 92],
      origin_orientation=[0, 0, 0],
      rotation=[0, 1, 0],
      bounds=(0, np.pi)
    ),
    
    # 5. Muñeca Roll (Servo 5): A 62 mm de la muñeca pitch. Gira en Z local (Giro de mano)
    ikpy.link.URDFLink(
      name="Muneca_Roll",
      origin_translation=[0, 0, 62],
      origin_orientation=[0, 0, 0],
      rotation=[0, 0, 1],
      bounds=(0, np.pi)
    ),
    
    # 6. End Effector / Pinza: A 32 mm. 
    # Es un "dummy link" para ikpy porque abrir/cerrar la pinza no cambia la distancia de alcance.
    ikpy.link.URDFLink(
      name="Pinza_EndEffector",
      origin_translation=[0, 0, 32],
      origin_orientation=[0, 0, 0],
      rotation=[0, 0, 0], # Sin rotación en el espacio de cálculo
      bounds=(0, np.pi)
    )
])

def calcular_angulos_ik(x, y, z):
    """
    Recibe coordenadas cartesianas (en mm) y devuelve una lista con 
    los 5 ángulos calculados para los servos (0-180 grados).
    """
    objetivo = [x, y, z]
    
    # ikpy devuelve un arreglo de radianes [Origin, Base, Hombro, Codo, MuñecaP, MuñecaR, EE]
    angulos_radianes = brazo_6dof.inverse_kinematics(objetivo)
    
    # Convertir de radianes a grados y redondear a entero
    angulos_grados = np.degrees(angulos_radianes).astype(int)
    
    # Retornamos solo los servos 1 al 5 (ignorando OriginLink [0] y el End Effector [6])
    return angulos_grados[1:6].tolist()

# Pequeña prueba de consola si ejecutas solo este archivo
if __name__ == "__main__":
    # Intentar alcanzar un objeto que está 150mm al frente, 0mm de lado, y 100mm de alto
    angulos = calcular_angulos_ik(150, 0, 100)
    print(f"Ángulos calculados para (150, 0, 100): {angulos}")
